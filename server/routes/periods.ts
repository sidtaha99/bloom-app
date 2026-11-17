import { Router } from 'express';
import { z } from 'zod';
import { diffDaysISO } from '../../shared/cycleEngine';
import type { DatabaseService } from '../db/database';
import { type AuthenticatedRequest, requireAuth } from '../middleware/auth';

const periodSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be YYYY-MM-DD'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be YYYY-MM-DD'),
  flowIntensity: z.enum(['spotting', 'light', 'medium', 'heavy']),
  notes: z.string().max(1000).optional(),
});

export function createPeriodsRouter(db: DatabaseService): Router {
  const router = Router();
  router.use(requireAuth);

  router.get('/', async (req: AuthenticatedRequest, res, next) => {
    try {
      const periods = await db.listPeriods(req.userId!);
      res.json({ periods });
    } catch (err) {
      next(err);
    }
  });

  router.post('/', async (req: AuthenticatedRequest, res, next) => {
    try {
      const parsed = periodSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid period input' });
        return;
      }

      const { startDate, endDate, flowIntensity, notes } = parsed.data;
      if (endDate < startDate) {
        res.status(400).json({ error: 'End date cannot be earlier than start date.' });
        return;
      }

      const duration = diffDaysISO(startDate, endDate) + 1;
      if (duration > 21) {
        res.status(400).json({
          error: 'Logged period duration exceeds 21 days. Please double-check your dates.',
        });
        return;
      }

      const existing = await db.listPeriods(req.userId!);
      const duplicate = existing.find(
        (p) => p.startDate === startDate && p.endDate === endDate
      );
      if (duplicate) {
        res.status(409).json({
          error: 'An identical period record already exists for these dates.',
        });
        return;
      }

      const overlap = existing.find(
        (p) => startDate <= p.endDate && endDate >= p.startDate
      );
      if (overlap) {
        res.status(409).json({
          error: `These dates overlap with an existing period (${overlap.startDate} to ${overlap.endDate}). Please edit the existing entry instead.`,
        });
        return;
      }

      const period = await db.createPeriod(req.userId!, {
        startDate,
        endDate,
        flowIntensity,
        notes,
      });

      // Keep cycleSettings.lastPeriodStartDate synchronized to the most recent logged period
      const allPeriods = await db.listPeriods(req.userId!);
      if (allPeriods[0]) {
        await db.updateCycleSettings(req.userId!, {
          lastPeriodStartDate: allPeriods[0].startDate,
          usesDefaultEstimates: false,
        });
      }

      res.status(201).json({ period });
    } catch (err) {
      next(err);
    }
  });

  router.put('/:id', async (req: AuthenticatedRequest, res, next) => {
    try {
      const parsed = periodSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid period input' });
        return;
      }

      const { startDate, endDate, flowIntensity, notes } = parsed.data;
      if (endDate < startDate) {
        res.status(400).json({ error: 'End date cannot be earlier than start date.' });
        return;
      }

      const duration = diffDaysISO(startDate, endDate) + 1;
      if (duration > 21) {
        res.status(400).json({
          error: 'Logged period duration exceeds 21 days. Please double-check your dates.',
        });
        return;
      }

      const existing = await db.listPeriods(req.userId!);
      const overlap = existing.find(
        (p) => p.id !== req.params.id && startDate <= p.endDate && endDate >= p.startDate
      );
      if (overlap) {
        res.status(409).json({
          error: `Updated dates overlap with another logged period (${overlap.startDate} to ${overlap.endDate}).`,
        });
        return;
      }

      const updated = await db.updatePeriod(req.userId!, String(req.params.id), {
        startDate,
        endDate,
        flowIntensity,
        notes,
      });
      if (!updated) {
        res.status(404).json({ error: 'Period record not found.' });
        return;
      }

      const allPeriods = await db.listPeriods(req.userId!);
      await db.updateCycleSettings(req.userId!, {
        lastPeriodStartDate: allPeriods[0]?.startDate || null,
      });

      res.json({ period: updated });
    } catch (err) {
      next(err);
    }
  });

  router.delete('/:id', async (req: AuthenticatedRequest, res, next) => {
    try {
      const deleted = await db.deletePeriod(req.userId!, String(req.params.id));
      if (!deleted) {
        res.status(404).json({ error: 'Period record not found.' });
        return;
      }
      const remaining = await db.listPeriods(req.userId!);
      await db.updateCycleSettings(req.userId!, {
        lastPeriodStartDate: remaining[0]?.startDate || null,
      });
      res.json({ deleted: true });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
