import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { config } from '../config';

export const SESSION_COOKIE_NAME = 'bloom_session';

export interface SessionPayload {
  userId: string;
  exp: number; // epoch ms
}

export interface AuthenticatedRequest extends Request {
  userId?: string;
  sessionToken?: string;
}

export function signSessionToken(userId: string, rememberMe = false): string {
  const ttlMs = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  const payload: SessionPayload = {
    userId,
    exp: Date.now() + ttlMs,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto
    .createHmac('sha256', config.sessionSecret)
    .update(encoded)
    .digest('base64url');
  return `${encoded}.${sig}`;
}

export function verifySessionToken(token: string | undefined): SessionPayload | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;
  const expectedSig = crypto
    .createHmac('sha256', config.sessionSecret)
    .update(encoded)
    .digest('base64url');

  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as SessionPayload;
    if (!payload.userId || !payload.exp || Date.now() > payload.exp) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

function isHttpsRequest(req?: Request): boolean {
  if (!req) return config.isProduction;
  const forwardedProto = (req.get('x-forwarded-proto') || '').split(',')[0]?.trim().toLowerCase();
  const origin = req.get('origin') || '';
  const referer = req.get('referer') || '';
  return Boolean(
    req.secure ||
      req.protocol === 'https' ||
      forwardedProto === 'https' ||
      origin.startsWith('https://') ||
      referer.startsWith('https://')
  );
}

export function setSessionCookie(
  res: Response,
  userId: string,
  rememberMe = false,
  req?: Request
): string {
  const token = signSessionToken(userId, rememberMe);
  const maxAge = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  const https = isHttpsRequest(req);
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: https,
    sameSite: https ? 'none' : 'lax',
    ...(https ? { partitioned: true } : {}),
    path: '/',
    maxAge,
  });
  return token;
}

export function clearSessionCookie(res: Response, req?: Request): void {
  const https = isHttpsRequest(req);
  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    secure: https,
    sameSite: https ? 'none' : 'lax',
    ...(https ? { partitioned: true } : {}),
    path: '/',
  });
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const cookieToken = req.cookies?.[SESSION_COOKIE_NAME] as string | undefined;
  const authHeader = req.get('authorization');
  const bearerToken =
    authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length).trim()
      : undefined;

  const cookieSession = verifySessionToken(cookieToken);
  const bearerSession = cookieSession ? null : verifySessionToken(bearerToken);
  const session = cookieSession || bearerSession;
  const activeToken = cookieSession ? cookieToken : bearerSession ? bearerToken : undefined;

  if (!session || !activeToken) {
    res.status(401).json({ error: 'Authentication required. Please sign in.' });
    return;
  }
  req.userId = session.userId;
  req.sessionToken = activeToken;
  next();
}

/**
 * Strips MongoDB operator injection keys ($gt, $ne, etc.) and prototype pollution keys recursively.
 */
export function sanitizeInput(obj: unknown): unknown {
  if (Array.isArray(obj)) {
    return obj.map(sanitizeInput);
  }
  if (obj && typeof obj === 'object') {
    const clean: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (key.startsWith('$') || key.includes('.') || key === '__proto__' || key === 'constructor') {
        continue;
      }
      clean[key] = sanitizeInput(value);
    }
    return clean;
  }
  return obj;
}

export function mongoSanitizeMiddleware(req: Request, _res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeInput(req.body);
  }
  next();
}

/**
 * CSRF protection for mutating API requests:
 * Requires custom X-Requested-With header (blocks simple cross-origin HTML form submissions)
 * and checks Origin/Referer when present in production.
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    next();
    return;
  }

  const requestedWith = req.get('X-Requested-With');
  if (requestedWith !== 'BloomApp') {
    res.status(403).json({ error: 'Missing required CSRF verification header.' });
    return;
  }

  next();
}

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: config.isTest ? 500 : 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please wait 15 minutes and try again.' },
});

export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: config.isTest ? 2000 : 400,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Rate limit exceeded. Please try again shortly.' },
});
