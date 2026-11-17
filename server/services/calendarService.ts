import { buildCalendarMonth, getTodayInTimezone } from '../../shared/cycleEngine';
import { generateCycleICS } from '../../shared/icsExport';
import type { DatabaseService } from '../db/database';

export interface CalendarICSExportOptions {
  cycles?: number;
  discreet?: boolean;
  includeFertile?: boolean;
}

export class CalendarService {
  constructor(private db: DatabaseService) {}

  async getMonthView(userId: string, year: number, month: number) {
    const [user, settings, periods, symptoms, moods, wellness] = await Promise.all([
      this.db.findUserById(userId),
      this.db.getCycleSettings(userId),
      this.db.listPeriods(userId),
      this.db.listSymptoms(userId),
      this.db.listMoods(userId),
      this.db.listWellness(userId),
    ]);
    const todayISO = getTodayInTimezone(user?.timezone || 'UTC');

    return buildCalendarMonth({
      year,
      month,
      todayISO,
      periods,
      settings,
      symptoms,
      moods,
      wellness,
    });
  }

  /**
   * Generates an RFC 5545 iCalendar (.ics) payload from upcoming cycle phase predictions.
   */
  async generateUpcomingCycleICS(
    userId: string,
    options: CalendarICSExportOptions = {}
  ): Promise<{ icsContent: string; eventCount: number }> {
    const [user, settings, periods] = await Promise.all([
      this.db.findUserById(userId),
      this.db.getCycleSettings(userId),
      this.db.listPeriods(userId),
    ]);
    const todayISO = getTodayInTimezone(user?.timezone || 'UTC');

    return generateCycleICS({
      periods,
      settings,
      referenceDateISO: todayISO,
      cyclesCount: options.cycles ?? 3,
      discreetMode: options.discreet ?? false,
      includeFertileWindow: options.includeFertile ?? true,
    });
  }
}
