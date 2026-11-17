import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { z } from 'zod';
import { config } from '../config';
import type { DatabaseService } from '../db/database';
import {
  type AuthenticatedRequest,
  authRateLimiter,
  clearSessionCookie,
  requireAuth,
  setSessionCookie,
} from '../middleware/auth';
import { emailService } from '../services/emailService';

const BCRYPT_ROUNDS = config.isTest ? 4 : 11;

function hashOtp(otp: string): string {
  return crypto.createHash('sha256').update(otp).digest('hex');
}

function generateSixDigitOtp(): string {
  return String(crypto.randomInt(100000, 999999));
}

function calculateAgeYears(dobISO: string): number {
  const dob = new Date(`${dobISO}T00:00:00Z`);
  if (Number.isNaN(dob.getTime())) return -1;
  const now = new Date();
  let age = now.getUTCFullYear() - dob.getUTCFullYear();
  const m = now.getUTCMonth() - dob.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < dob.getUTCDate())) {
    age--;
  }
  return age;
}

function toSafeUser(user: {
  id: string;
  fullName: string;
  email: string;
  dateOfBirth: string;
  isEmailVerified: boolean;
  onboardingCompleted: boolean;
  timezone: string;
  themePreference: 'light' | 'dark';
  privacyShowEstimatesNotice: boolean;
  createdAt: string;
  updatedAt: string;
}) {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    dateOfBirth: user.dateOfBirth,
    isEmailVerified: user.isEmailVerified,
    onboardingCompleted: user.onboardingCompleted,
    timezone: user.timezone,
    themePreference: user.themePreference,
    privacyShowEstimatesNotice: user.privacyShowEstimatesNotice,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

const registerSchema = z
  .object({
    fullName: z.string().trim().min(2, 'Full name must be at least 2 characters').max(120),
    email: z.string().trim().email('Please enter a valid email address').max(160),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(128)
      .regex(/[A-Za-z]/, 'Password must contain at least one letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string(),
    dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter date of birth in YYYY-MM-DD format'),
    termsAccepted: z.literal(true, {
      message: 'You must agree to the Terms of Service and Privacy Policy',
    }),
    timezone: z.string().trim().max(80).optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

const verifyEmailSchema = z.object({
  email: z.string().trim().email(),
  otp: z.string().trim().regex(/^\d{6}$/, 'Verification code must be 6 digits'),
});

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address'),
});

const resetPasswordSchema = z
  .object({
    email: z.string().trim().email(),
    otp: z.string().trim().regex(/^\d{6}$/, 'Reset code must be 6 digits'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(128)
      .regex(/[A-Za-z]/, 'Password must contain at least one letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

const onboardingSchema = z.object({
  skip: z.boolean().optional(),
  lastPeriodStartDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  averageCycleLength: z.number().int().min(18).max(60).optional(),
  averagePeriodDuration: z.number().int().min(1).max(14).optional(),
  cycleRegularity: z.enum(['regular', 'somewhat_irregular', 'irregular', 'unsure']).optional(),
  logInitialPeriod: z.boolean().optional(),
  trackingPreferences: z
    .object({
      trackSymptoms: z.boolean().optional(),
      trackMood: z.boolean().optional(),
      trackWellness: z.boolean().optional(),
      dietPreference: z.enum(['all', 'vegetarian', 'non_vegetarian']).optional(),
    })
    .optional(),
});

export function createAuthRouter(db: DatabaseService): Router {
  const router = Router();

  router.post('/register', authRateLimiter, async (req, res, next) => {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid registration data' });
        return;
      }

      const age = calculateAgeYears(parsed.data.dateOfBirth);
      if (age < 13 || age > 110) {
        res.status(400).json({
          error:
            age < 13
              ? 'You must be at least 13 years old to create a personal Bloom account.'
              : 'Please enter a valid date of birth.',
        });
        return;
      }

      const existing = await db.findUserByEmail(parsed.data.email);
      if (existing) {
        res.status(409).json({ error: 'An account with this email already exists.' });
        return;
      }

      const passwordHash = await bcrypt.hash(parsed.data.password, BCRYPT_ROUNDS);
      const user = await db.createUser({
        fullName: parsed.data.fullName,
        email: parsed.data.email,
        passwordHash,
        dateOfBirth: parsed.data.dateOfBirth,
        timezone: parsed.data.timezone || 'UTC',
      });

      const otp = generateSixDigitOtp();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
      await db.createOtpToken('email_verification', {
        userId: user.id,
        email: user.email,
        otpHash: hashOtp(otp),
        expiresAt,
        maxAttempts: 5,
      });

      const emailResult = await emailService.sendVerificationOtp(user.email, user.fullName, otp);

      res.status(201).json({
        message: emailResult.sent
          ? 'Account created. A 6-digit verification code has been sent to your email.'
          : 'Account created. Email delivery is not configured (BREVO_API_KEY missing); use the preview verification code below to verify your account.',
        email: user.email,
        requiresVerification: true,
        emailDelivery: {
          sent: emailResult.sent,
          provider: emailResult.provider,
          reason: emailResult.reason,
        },
        ...(emailResult.sent || config.isProduction ? {} : { devOtp: otp }),
      });
    } catch (err) {
      next(err);
    }
  });

  router.post('/verify-email', authRateLimiter, async (req, res, next) => {
    try {
      const parsed = verifyEmailSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid verification input' });
        return;
      }

      const email = parsed.data.email.toLowerCase();
      const user = await db.findUserByEmail(email);
      if (!user) {
        res.status(404).json({ error: 'No account found for that email address.' });
        return;
      }

      if (user.isEmailVerified) {
        const sessionToken = setSessionCookie(res, user.id, false, req);
        const settings = await db.getCycleSettings(user.id);
        res.json({ user: toSafeUser(user), cycleSettings: settings, sessionToken });
        return;
      }

      const token = await db.getLatestActiveOtpToken('email_verification', email);
      if (!token) {
        res.status(400).json({ error: 'No active verification code found. Please request a new code.' });
        return;
      }

      if (new Date(token.expiresAt).getTime() < Date.now()) {
        res.status(400).json({ error: 'Verification code has expired. Please request a new code.' });
        return;
      }

      if (token.attempts >= token.maxAttempts) {
        res.status(429).json({
          error: 'Maximum verification attempts reached. Please request a new verification code.',
        });
        return;
      }

      if (hashOtp(parsed.data.otp) !== token.otpHash) {
        await db.incrementOtpAttempts('email_verification', token.id);
        const remaining = Math.max(0, token.maxAttempts - (token.attempts + 1));
        res.status(400).json({
          error: `Incorrect verification code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`,
        });
        return;
      }

      await db.markOtpUsed('email_verification', token.id);
      const updatedUser = (await db.updateUser(user.id, { isEmailVerified: true }))!;
      const sessionToken = setSessionCookie(res, updatedUser.id, false, req);
      const settings = await db.getCycleSettings(updatedUser.id);

      res.json({
        message: 'Email verified successfully.',
        user: toSafeUser(updatedUser),
        cycleSettings: settings,
        sessionToken,
      });
    } catch (err) {
      next(err);
    }
  });

  router.post('/resend-otp', authRateLimiter, async (req, res, next) => {
    try {
      const parsed = forgotPasswordSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Please provide a valid email address.' });
        return;
      }

      const user = await db.findUserByEmail(parsed.data.email);
      if (!user) {
        res.json({ message: 'If an unverified account exists for that email, a code has been generated.' });
        return;
      }
      if (user.isEmailVerified) {
        res.status(400).json({ error: 'This email address is already verified. Please sign in.' });
        return;
      }

      const otp = generateSixDigitOtp();
      await db.createOtpToken('email_verification', {
        userId: user.id,
        email: user.email,
        otpHash: hashOtp(otp),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        maxAttempts: 5,
      });

      const emailResult = await emailService.sendVerificationOtp(user.email, user.fullName, otp);

      res.json({
        message: emailResult.sent
          ? 'A fresh 6-digit verification code has been sent.'
          : 'Brevo email is not configured (BREVO_API_KEY missing). Use the preview OTP below.',
        emailDelivery: {
          sent: emailResult.sent,
          provider: emailResult.provider,
          reason: emailResult.reason,
        },
        ...(emailResult.sent || config.isProduction ? {} : { devOtp: otp }),
      });
    } catch (err) {
      next(err);
    }
  });

  router.post('/login', authRateLimiter, async (req, res, next) => {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid credentials' });
        return;
      }

      const user = await db.findUserByEmail(parsed.data.email);
      if (!user) {
        res.status(401).json({ error: 'Invalid email or password.' });
        return;
      }

      const passwordMatches = await bcrypt.compare(parsed.data.password, user.passwordHash);
      if (!passwordMatches) {
        res.status(401).json({ error: 'Invalid email or password.' });
        return;
      }

      if (!user.isEmailVerified) {
        res.status(403).json({
          error: 'Please verify your email address before signing in.',
          requiresVerification: true,
          email: user.email,
        });
        return;
      }

      const sessionToken = setSessionCookie(res, user.id, Boolean(parsed.data.rememberMe), req);
      const settings = await db.getCycleSettings(user.id);

      res.json({
        user: toSafeUser(user),
        cycleSettings: settings,
        sessionToken,
      });
    } catch (err) {
      next(err);
    }
  });

  router.post('/logout', (req, res) => {
    clearSessionCookie(res, req);
    res.json({ message: 'Signed out safely.' });
  });

  router.post('/forgot-password', authRateLimiter, async (req, res, next) => {
    try {
      const parsed = forgotPasswordSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message || 'Valid email is required' });
        return;
      }

      const user = await db.findUserByEmail(parsed.data.email);
      if (!user) {
        res.json({
          message: 'If an account matches that email, a 6-digit password reset code has been prepared.',
          emailDelivery: { sent: emailService.isConfigured(), provider: config.emailProvider },
        });
        return;
      }

      const otp = generateSixDigitOtp();
      await db.createOtpToken('password_reset', {
        userId: user.id,
        email: user.email,
        otpHash: hashOtp(otp),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        maxAttempts: 5,
      });

      const emailResult = await emailService.sendPasswordResetOtp(user.email, user.fullName, otp);

      res.json({
        message: emailResult.sent
          ? 'A 6-digit password reset code has been sent to your email.'
          : 'Email delivery requires BREVO_API_KEY configuration. Use the preview reset code below.',
        emailDelivery: {
          sent: emailResult.sent,
          provider: emailResult.provider,
          reason: emailResult.reason,
        },
        ...(emailResult.sent || config.isProduction ? {} : { devOtp: otp }),
      });
    } catch (err) {
      next(err);
    }
  });

  router.post('/reset-password', authRateLimiter, async (req, res, next) => {
    try {
      const parsed = resetPasswordSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid reset request' });
        return;
      }

      const email = parsed.data.email.toLowerCase();
      const user = await db.findUserByEmail(email);
      if (!user) {
        res.status(400).json({ error: 'Invalid or expired password reset code.' });
        return;
      }

      const token = await db.getLatestActiveOtpToken('password_reset', email);
      if (!token) {
        res.status(400).json({ error: 'No active reset code found. Please request a new one.' });
        return;
      }

      if (new Date(token.expiresAt).getTime() < Date.now()) {
        res.status(400).json({ error: 'Reset code has expired. Please request a new code.' });
        return;
      }

      if (token.attempts >= token.maxAttempts) {
        res.status(429).json({
          error: 'Maximum reset attempts exceeded. Please request a new code.',
        });
        return;
      }

      if (hashOtp(parsed.data.otp) !== token.otpHash) {
        await db.incrementOtpAttempts('password_reset', token.id);
        const remaining = Math.max(0, token.maxAttempts - (token.attempts + 1));
        res.status(400).json({
          error: `Incorrect reset code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`,
        });
        return;
      }

      await db.markOtpUsed('password_reset', token.id);
      const newHash = await bcrypt.hash(parsed.data.newPassword, BCRYPT_ROUNDS);
      await db.updateUser(user.id, { passwordHash: newHash, isEmailVerified: true });

      await db.ensureNotification(user.id, {
        type: 'security',
        title: 'Password Updated',
        message: 'Your Bloom account password was reset successfully.',
        scheduledForDate: new Date().toISOString().slice(0, 10),
      });
      await emailService.sendSecurityAlert(
        user.email,
        user.fullName,
        'Your Bloom account password was recently reset.'
      );

      res.json({ message: 'Your password has been reset. You can now sign in.' });
    } catch (err) {
      next(err);
    }
  });

  router.get('/me', requireAuth, async (req: AuthenticatedRequest, res, next) => {
    try {
      const user = await db.findUserById(req.userId!);
      if (!user) {
        clearSessionCookie(res, req);
        res.status(401).json({ error: 'Session no longer valid.' });
        return;
      }
      const settings = await db.getCycleSettings(user.id);
      res.json({
        user: toSafeUser(user),
        cycleSettings: settings,
        sessionToken: req.sessionToken,
      });
    } catch (err) {
      next(err);
    }
  });

  router.post('/onboarding', requireAuth, async (req: AuthenticatedRequest, res, next) => {
    try {
      const parsed = onboardingSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid onboarding values' });
        return;
      }

      const data = parsed.data;
      const usesDefaults = Boolean(data.skip) || !data.lastPeriodStartDate;
      const cycleLength = data.averageCycleLength ?? 29;
      const periodDuration = data.averagePeriodDuration ?? 5;

      const updatedSettings = await db.updateCycleSettings(req.userId!, {
        lastPeriodStartDate: data.lastPeriodStartDate ?? null,
        averageCycleLength: cycleLength,
        averagePeriodDuration: periodDuration,
        cycleRegularity: data.cycleRegularity ?? 'unsure',
        usesDefaultEstimates: usesDefaults,
        trackingPreferences: data.trackingPreferences,
      });

      if (data.lastPeriodStartDate && data.logInitialPeriod !== false) {
        const existingPeriods = await db.listPeriods(req.userId!);
        if (existingPeriods.length === 0) {
          const dt = new Date(`${data.lastPeriodStartDate}T00:00:00Z`);
          dt.setUTCDate(dt.getUTCDate() + (periodDuration - 1));
          const endDate = dt.toISOString().slice(0, 10);
          await db.createPeriod(req.userId!, {
            startDate: data.lastPeriodStartDate,
            endDate,
            flowIntensity: 'medium',
            notes: 'Initial period logged during onboarding',
          });
        }
      }

      const user = await db.updateUser(req.userId!, { onboardingCompleted: true });
      res.json({
        user: user ? toSafeUser(user) : null,
        cycleSettings: updatedSettings,
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
