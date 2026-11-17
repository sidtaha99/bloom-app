import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { z } from 'zod';
import { config } from '../config';
import type { DatabaseService } from '../db/database';
import {
  type AuthenticatedRequest,
  clearSessionCookie,
  requireAuth,
} from '../middleware/auth';
import { emailService } from '../services/emailService';

const BCRYPT_ROUNDS = config.isTest ? 4 : 11;

const updateProfileSchema = z.object({
  fullName: z.string().trim().min(2).max(120).optional(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  timezone: z.string().trim().min(1).max(80).optional(),
  themePreference: z.enum(['light', 'dark']).optional(),
  privacyShowEstimatesNotice: z.boolean().optional(),
  cycleSettings: z
    .object({
      lastPeriodStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
      averageCycleLength: z.number().int().min(18).max(60).optional(),
      averagePeriodDuration: z.number().int().min(1).max(14).optional(),
      cycleRegularity: z.enum(['regular', 'somewhat_irregular', 'irregular', 'unsure']).optional(),
      trackingPreferences: z
        .object({
          trackSymptoms: z.boolean().optional(),
          trackMood: z.boolean().optional(),
          trackWellness: z.boolean().optional(),
          dietPreference: z.enum(['all', 'vegetarian', 'non_vegetarian']).optional(),
        })
        .optional(),
      notificationPreferences: z
        .object({
          upcomingPeriodReminders: z.boolean().optional(),
          periodReminderDaysBefore: z.number().int().min(1).max(7).optional(),
          periodReminderTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
          wellnessReminders: z.boolean().optional(),
          wellnessReminderTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
          hydrationReminders: z.boolean().optional(),
          hydrationReminderTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
          browserNotificationsEnabled: z.boolean().optional(),
        })
        .optional(),
    })
    .optional(),
});

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'New password must be at least 8 characters')
      .max(128)
      .regex(/[A-Za-z]/, 'Password must include a letter')
      .regex(/[0-9]/, 'Password must include a number'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'New passwords do not match',
    path: ['confirmPassword'],
  });

const deleteAccountSchema = z.object({
  password: z.string().min(1, 'Password confirmation is required to delete your account'),
});

function escapeCsvField(val: unknown): string {
  const s = String(val ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function createProfileRouter(db: DatabaseService): Router {
  const router = Router();
  router.use(requireAuth);

  router.get('/', async (req: AuthenticatedRequest, res, next) => {
    try {
      const user = await db.findUserById(req.userId!);
      if (!user) {
        res.status(404).json({ error: 'User not found.' });
        return;
      }
      const cycleSettings = await db.getCycleSettings(user.id);
      const { passwordHash: _ph, ...safeUser } = user;
      res.json({ user: safeUser, cycleSettings });
    } catch (err) {
      next(err);
    }
  });

  router.put('/', async (req: AuthenticatedRequest, res, next) => {
    try {
      const parsed = updateProfileSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid profile update' });
        return;
      }

      const { cycleSettings: csPatch, ...userPatch } = parsed.data;
      const updatedUser = await db.updateUser(req.userId!, userPatch);
      if (!updatedUser) {
        res.status(404).json({ error: 'User not found.' });
        return;
      }

      let updatedSettings = await db.getCycleSettings(req.userId!);
      if (csPatch) {
        updatedSettings = await db.updateCycleSettings(req.userId!, {
          lastPeriodStartDate: csPatch.lastPeriodStartDate,
          averageCycleLength: csPatch.averageCycleLength,
          averagePeriodDuration: csPatch.averagePeriodDuration,
          cycleRegularity: csPatch.cycleRegularity,
          usesDefaultEstimates: false,
          trackingPreferences: csPatch.trackingPreferences,
          notificationPreferences: csPatch.notificationPreferences,
        });
      }

      const { passwordHash: _ph, ...safeUser } = updatedUser;
      res.json({ user: safeUser, cycleSettings: updatedSettings });
    } catch (err) {
      next(err);
    }
  });

  router.put('/password', async (req: AuthenticatedRequest, res, next) => {
    try {
      const parsed = changePasswordSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid password request' });
        return;
      }

      const user = await db.findUserById(req.userId!);
      if (!user) {
        res.status(404).json({ error: 'User not found.' });
        return;
      }

      const matches = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
      if (!matches) {
        res.status(401).json({ error: 'Current password is incorrect.' });
        return;
      }

      const newHash = await bcrypt.hash(parsed.data.newPassword, BCRYPT_ROUNDS);
      await db.updateUser(user.id, { passwordHash: newHash });

      await db.ensureNotification(user.id, {
        type: 'security',
        title: 'Password Changed',
        message: 'Your Bloom account password was updated.',
        scheduledForDate: new Date().toISOString().slice(0, 10),
      });
      await emailService.sendSecurityAlert(
        user.email,
        user.fullName,
        'Your Bloom account password was changed from your profile settings.'
      );

      res.json({ message: 'Password updated successfully.' });
    } catch (err) {
      next(err);
    }
  });

  router.get('/export', async (req: AuthenticatedRequest, res, next) => {
    try {
      const format = String(req.query.format || 'json').toLowerCase();
      const user = await db.findUserById(req.userId!);
      if (!user) {
        res.status(404).json({ error: 'User not found.' });
        return;
      }

      const [cycleSettings, periods, symptoms, moods, wellness] = await Promise.all([
        db.getCycleSettings(user.id),
        db.listPeriods(user.id),
        db.listSymptoms(user.id),
        db.listMoods(user.id),
        db.listWellness(user.id),
      ]);

      const { passwordHash: _ph, ...safeUser } = user;

      if (format === 'csv') {
        const lines: string[] = [
          'recordType,dateOrStartDate,endDate,categoryOrFlow,detailsOrMood,severityOrEnergy,notes',
        ];
        for (const p of periods) {
          lines.push(
            [
              'period',
              p.startDate,
              p.endDate,
              p.flowIntensity,
              '',
              '',
              p.notes,
            ]
              .map(escapeCsvField)
              .join(',')
          );
        }
        for (const s of symptoms) {
          lines.push(
            [
              'symptom',
              s.date,
              '',
              'physical/emotional',
              [...s.physicalSymptoms, ...s.emotionalSymptoms, s.otherSymptomText]
                .filter(Boolean)
                .join('; '),
              s.severity,
              s.notes,
            ]
              .map(escapeCsvField)
              .join(',')
          );
        }
        for (const m of moods) {
          lines.push(
            ['mood', m.date, '', 'mood', m.mood, '', m.notes].map(escapeCsvField).join(',')
          );
        }
        for (const w of wellness) {
          lines.push(
            [
              'wellness',
              w.date,
              '',
              w.exerciseType || 'daily_wellness',
              `water:${w.waterIntakeMl}ml; sleep:${w.sleepHours}h; activity:${w.physicalActivityMinutes}m`,
              w.energyLevel,
              w.selfCareNotes,
            ]
              .map(escapeCsvField)
              .join(',')
          );
        }

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="bloom-personal-export.csv"');
        res.send(lines.join('\n'));
        return;
      }

      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="bloom-personal-export.json"');
      res.json({
        exportedAt: new Date().toISOString(),
        application: 'Bloom',
        profile: safeUser,
        cycleSettings,
        periods,
        symptoms,
        moods,
        wellness,
      });
    } catch (err) {
      next(err);
    }
  });

  router.delete('/', async (req: AuthenticatedRequest, res, next) => {
    try {
      const parsed = deleteAccountSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message || 'Password required' });
        return;
      }

      const user = await db.findUserById(req.userId!);
      if (!user) {
        res.status(404).json({ error: 'Account not found.' });
        return;
      }

      const matches = await bcrypt.compare(parsed.data.password, user.passwordHash);
      if (!matches) {
        res.status(401).json({ error: 'Incorrect password. Account deletion cancelled.' });
        return;
      }

      await db.deleteUserAndAllData(user.id);
      clearSessionCookie(res, req);
      res.json({ deleted: true, message: 'Your account and all personal records have been permanently deleted.' });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
