import { Router } from 'express';
import { z } from 'zod';
import type { DatabaseService } from '../db/database';
import { type AuthenticatedRequest, requireAuth } from '../middleware/auth';

const symptomSchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
    physicalSymptoms: z.array(z.string().max(60)).max(20).default([]),
    emotionalSymptoms: z.array(z.string().max(60)).max(20).default([]),
    otherSymptomText: z.string().max(200).optional(),
    severity: z.number().int().min(1).max(5),
    notes: z.string().max(1000).optional(),
  })
  .refine(
    (d) =>
      d.physicalSymptoms.length > 0 ||
      d.emotionalSymptoms.length > 0 ||
      Boolean(d.otherSymptomText?.trim()),
    { message: 'Please select or enter at least one symptom.' }
  );

const moodSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  mood: z.enum(['happy', 'calm', 'energetic', 'neutral', 'anxious', 'sad', 'irritable', 'tired']),
  notes: z.string().max(1000).optional(),
});

const wellnessSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  waterIntakeMl: z.number().min(0).max(10000),
  sleepHours: z.number().min(0).max(24),
  physicalActivityMinutes: z.number().int().min(0).max(720),
  exerciseType: z.string().max(120).optional(),
  energyLevel: z.number().int().min(1).max(5),
  selfCareNotes: z.string().max(1000).optional(),
});

export function createSymptomsRouter(db: DatabaseService): Router {
  const router = Router();
  router.use(requireAuth);

  router.get('/', async (req: AuthenticatedRequest, res, next) => {
    try {
      const symptoms = await db.listSymptoms(req.userId!);
      res.json({ symptoms });
    } catch (err) {
      next(err);
    }
  });

  router.post('/', async (req: AuthenticatedRequest, res, next) => {
    try {
      const parsed = symptomSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid symptom entry' });
        return;
      }
      const entry = await db.createSymptom(req.userId!, parsed.data);
      res.status(201).json({ symptom: entry });
    } catch (err) {
      next(err);
    }
  });

  router.put('/:id', async (req: AuthenticatedRequest, res, next) => {
    try {
      const parsed = symptomSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid symptom entry' });
        return;
      }
      const updated = await db.updateSymptom(req.userId!, String(req.params.id), parsed.data);
      if (!updated) {
        res.status(404).json({ error: 'Symptom record not found.' });
        return;
      }
      res.json({ symptom: updated });
    } catch (err) {
      next(err);
    }
  });

  router.delete('/:id', async (req: AuthenticatedRequest, res, next) => {
    try {
      const deleted = await db.deleteSymptom(req.userId!, String(req.params.id));
      if (!deleted) {
        res.status(404).json({ error: 'Symptom record not found.' });
        return;
      }
      res.json({ deleted: true });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

export function createMoodsRouter(db: DatabaseService): Router {
  const router = Router();
  router.use(requireAuth);

  router.get('/', async (req: AuthenticatedRequest, res, next) => {
    try {
      const moods = await db.listMoods(req.userId!);
      res.json({ moods });
    } catch (err) {
      next(err);
    }
  });

  router.post('/', async (req: AuthenticatedRequest, res, next) => {
    try {
      const parsed = moodSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid mood entry' });
        return;
      }
      const entry = await db.createMood(req.userId!, parsed.data);
      res.status(201).json({ mood: entry });
    } catch (err) {
      next(err);
    }
  });

  router.put('/:id', async (req: AuthenticatedRequest, res, next) => {
    try {
      const parsed = moodSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid mood entry' });
        return;
      }
      const updated = await db.updateMood(req.userId!, String(req.params.id), parsed.data);
      if (!updated) {
        res.status(404).json({ error: 'Mood record not found.' });
        return;
      }
      res.json({ mood: updated });
    } catch (err) {
      next(err);
    }
  });

  router.delete('/:id', async (req: AuthenticatedRequest, res, next) => {
    try {
      const deleted = await db.deleteMood(req.userId!, String(req.params.id));
      if (!deleted) {
        res.status(404).json({ error: 'Mood record not found.' });
        return;
      }
      res.json({ deleted: true });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

export function createWellnessRouter(db: DatabaseService): Router {
  const router = Router();
  router.use(requireAuth);

  router.get('/', async (req: AuthenticatedRequest, res, next) => {
    try {
      const entries = await db.listWellness(req.userId!);
      res.json({ wellness: entries });
    } catch (err) {
      next(err);
    }
  });

  router.post('/', async (req: AuthenticatedRequest, res, next) => {
    try {
      const parsed = wellnessSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid wellness entry' });
        return;
      }
      const entry = await db.createWellness(req.userId!, parsed.data);
      res.status(201).json({ wellness: entry });
    } catch (err) {
      next(err);
    }
  });

  router.put('/:id', async (req: AuthenticatedRequest, res, next) => {
    try {
      const parsed = wellnessSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid wellness entry' });
        return;
      }
      const updated = await db.updateWellness(req.userId!, String(req.params.id), parsed.data);
      if (!updated) {
        res.status(404).json({ error: 'Wellness record not found.' });
        return;
      }
      res.json({ wellness: updated });
    } catch (err) {
      next(err);
    }
  });

  router.delete('/:id', async (req: AuthenticatedRequest, res, next) => {
    try {
      const deleted = await db.deleteWellness(req.userId!, String(req.params.id));
      if (!deleted) {
        res.status(404).json({ error: 'Wellness record not found.' });
        return;
      }
      res.json({ deleted: true });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
