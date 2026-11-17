import { Router } from 'express';
import { type AuthenticatedRequest, requireAuth } from '../middleware/auth';
import { CalendarService } from '../services/calendarService';
import type { CycleService } from '../services/cycleService';

export function createCycleRouter(
  cycleService: CycleService,
  calendarService?: CalendarService
): Router {
  const router = Router();
  router.use(requireAuth);

  router.get('/overview', async (req: AuthenticatedRequest, res, next) => {
    try {
      const overview = await cycleService.getOverview(req.userId!);
      res.json(overview);
    } catch (err) {
      next(err);
    }
  });

  router.get('/calendar', async (req: AuthenticatedRequest, res, next) => {
    try {
      const now = new Date();
      const year = Number(req.query.year || now.getUTCFullYear());
      const month = Number(req.query.month || now.getUTCMonth() + 1);
      if (!Number.isInteger(year) || year < 1970 || year > 2100) {
        res.status(400).json({ error: 'Invalid calendar year.' });
        return;
      }
      if (!Number.isInteger(month) || month < 1 || month > 12) {
        res.status(400).json({ error: 'Invalid calendar month (1-12).' });
        return;
      }
      const calendar = calendarService
        ? await calendarService.getMonthView(req.userId!, year, month)
        : await cycleService.getCalendar(req.userId!, year, month);
      res.json(calendar);
    } catch (err) {
      next(err);
    }
  });

  router.get('/export.ics', async (req: AuthenticatedRequest, res, next) => {
    try {
      const cycles = Number(req.query.cycles || 3);
      const discreet = String(req.query.discreet || 'false') === 'true';
      const includeFertile = String(req.query.includeFertile || 'true') !== 'false';

      const exportOptions = {
        cycles: Number.isFinite(cycles) ? cycles : 3,
        discreet,
        includeFertile,
      };
      const { icsContent, eventCount } = calendarService
        ? await calendarService.generateUpcomingCycleICS(req.userId!, exportOptions)
        : await cycleService.exportCalendarICS(req.userId!, exportOptions);

      if (eventCount === 0) {
        res.status(400).json({
          error:
            'Please log at least one period or set your last period start date in Cycle Settings before exporting an upcoming schedule.',
        });
        return;
      }

      res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="bloom-cycle-schedule.ics"'
      );
      res.send(icsContent);
    } catch (err) {
      next(err);
    }
  });

  router.get('/history', async (req: AuthenticatedRequest, res, next) => {
    try {
      const history = await cycleService.getHistoryAndAnalytics(req.userId!);
      res.json(history);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
