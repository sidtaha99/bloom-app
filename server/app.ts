import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import helmet from 'helmet';
import { config } from './config';
import type { DatabaseService } from './db/database';
import {
  apiRateLimiter,
  csrfProtection,
  mongoSanitizeMiddleware,
} from './middleware/auth';
import { createAuthRouter } from './routes/auth';
import {
  createContentRouter,
  createNotificationsRouter,
} from './routes/contentAndNotifications';
import { createCycleRouter } from './routes/cycle';
import { createPeriodsRouter } from './routes/periods';
import { createProfileRouter } from './routes/profile';
import {
  createMoodsRouter,
  createSymptomsRouter,
  createWellnessRouter,
} from './routes/trackers';
import { CalendarService } from './services/calendarService';
import { CycleService } from './services/cycleService';
import { emailService } from './services/emailService';

export function createApp(db: DatabaseService) {
  const app = express();
  const cycleService = new CycleService(db);
  const calendarService = new CalendarService(db);

  app.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    })
  );

  app.use(
    cors({
      origin: config.isProduction ? config.corsOrigin : true,
      credentials: true,
    })
  );

  app.use(express.json({ limit: '256kb' }));
  app.use(cookieParser());
  app.use(mongoSanitizeMiddleware);

  // Request logger (concise, never logs private health payloads)
  if (!config.isTest) {
    app.use('/api', (req, res, next) => {
      const start = Date.now();
      res.on('finish', () => {
        const ms = Date.now() - start;
        console.log(`[API] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${ms}ms)`);
      });
      next();
    });
  }

  // Health & readiness endpoints
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'bloom-api',
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/api/ready', (_req, res) => {
    const healthy = db.isHealthy();
    res.status(healthy ? 200 : 503).json({
      ready: healthy,
      databaseMode: db.getMode(),
      emailConfigured: emailService.isConfigured(),
      emailProvider: config.emailProvider,
      timestamp: new Date().toISOString(),
    });
  });

  // Apply rate limiting & CSRF check on all /api routes
  app.use('/api', apiRateLimiter);
  app.use('/api', csrfProtection);

  app.use('/api/auth', createAuthRouter(db));
  app.use('/api/periods', createPeriodsRouter(db));
  app.use('/api/cycle', createCycleRouter(cycleService, calendarService));
  app.use('/api/symptoms', createSymptomsRouter(db));
  app.use('/api/moods', createMoodsRouter(db));
  app.use('/api/wellness', createWellnessRouter(db));
  app.use('/api/content', createContentRouter(db));
  app.use('/api/notifications', createNotificationsRouter(db));
  app.use('/api/profile', createProfileRouter(db));

  // Explicit 404 for unknown API paths (including confirming no admin endpoints exist)
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'API endpoint not found.' });
  });

  // Safe error handler
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    if (!config.isTest) {
      console.error('[API Error]', err.message);
    }
    res.status(500).json({
      error: config.isProduction
        ? 'An unexpected server error occurred. Please try again.'
        : err.message || 'Internal server error',
    });
  });

  return app;
}
