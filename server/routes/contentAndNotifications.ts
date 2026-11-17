import { Router } from 'express';
import { z } from 'zod';
import type { DatabaseService } from '../db/database';
import { type AuthenticatedRequest, requireAuth } from '../middleware/auth';
import { CycleService } from '../services/cycleService';

const createReminderSchema = z.object({
  title: z.string().trim().min(1, 'Reminder title is required').max(120),
  message: z.string().trim().max(300).optional(),
  reminderTime: z.string().regex(/^\d{2}:\d{2}$/, 'Enter reminder time in HH:MM format'),
  frequency: z.enum(['daily', 'once']).default('daily'),
  scheduledDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  enabled: z.boolean().optional(),
});

const updateReminderSchema = createReminderSchema.partial();

export function createContentRouter(db: DatabaseService): Router {
  const router = Router();

  router.get('/nutrition', async (_req, res, next) => {
    try {
      const phases = await db.getNutritionContent();
      res.json({ nutrition: phases });
    } catch (err) {
      next(err);
    }
  });

  router.get('/phases', async (_req, res, next) => {
    try {
      const phases = await db.getNutritionContent();
      res.json({
        phases: phases.map((p) => ({
          phase: p.phase,
          title: p.title,
          theme: p.theme,
          shortDescription: p.shortDescription,
          typicalDayRangeLabel: p.typicalDayRangeLabel,
        })),
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

export function createNotificationsRouter(db: DatabaseService): Router {
  const router = Router();
  const cycleService = new CycleService(db);
  router.use(requireAuth);

  router.get('/', async (req: AuthenticatedRequest, res, next) => {
    try {
      await cycleService.syncAllDueReminders(req.userId!);
      const [notifications, reminders] = await Promise.all([
        db.listNotifications(req.userId!),
        db.listCustomReminders(req.userId!),
      ]);
      res.json({ notifications, reminders });
    } catch (err) {
      next(err);
    }
  });

  router.post('/sync', async (req: AuthenticatedRequest, res, next) => {
    try {
      const newlyTriggered = await cycleService.syncAllDueReminders(req.userId!);
      const notifications = await db.listNotifications(req.userId!);
      res.json({ notifications, newlyTriggered });
    } catch (err) {
      next(err);
    }
  });

  router.get('/reminders', async (req: AuthenticatedRequest, res, next) => {
    try {
      const reminders = await db.listCustomReminders(req.userId!);
      res.json({ reminders });
    } catch (err) {
      next(err);
    }
  });

  router.post('/reminders', async (req: AuthenticatedRequest, res, next) => {
    try {
      const parsed = createReminderSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid reminder data' });
        return;
      }
      const reminder = await db.createCustomReminder(req.userId!, parsed.data);
      const newlyTriggered = await cycleService.syncAllDueReminders(req.userId!);
      res.status(201).json({ reminder, newlyTriggered });
    } catch (err) {
      next(err);
    }
  });

  router.put('/reminders/:id', async (req: AuthenticatedRequest, res, next) => {
    try {
      const parsed = updateReminderSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid reminder update' });
        return;
      }
      const updated = await db.updateCustomReminder(req.userId!, String(req.params.id), {
        ...parsed.data,
        // If user edited time or re-enabled, allow triggering again today if time hasn't passed or matches
        ...(parsed.data.reminderTime ? { lastTriggeredDate: null } : {}),
      });
      if (!updated) {
        res.status(404).json({ error: 'Reminder not found.' });
        return;
      }
      res.json({ reminder: updated });
    } catch (err) {
      next(err);
    }
  });

  router.delete('/reminders/:id', async (req: AuthenticatedRequest, res, next) => {
    try {
      const ok = await db.deleteCustomReminder(req.userId!, String(req.params.id));
      if (!ok) {
        res.status(404).json({ error: 'Reminder not found.' });
        return;
      }
      res.json({ deleted: true });
    } catch (err) {
      next(err);
    }
  });

  router.put('/read-all', async (req: AuthenticatedRequest, res, next) => {
    try {
      await db.markAllNotificationsRead(req.userId!);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  });

  router.put('/:id/read', async (req: AuthenticatedRequest, res, next) => {
    try {
      const ok = await db.markNotificationRead(req.userId!, String(req.params.id));
      if (!ok) {
        res.status(404).json({ error: 'Notification not found.' });
        return;
      }
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
