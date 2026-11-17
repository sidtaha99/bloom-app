import {
  buildCalendarMonth,
  buildCycleHistory,
  calculateCycleOverview,
  computeCycleMetrics,
  computePhaseRanges,
  determinePhaseForCycleDay,
  diffDaysISO,
  getTodayInTimezone,
} from '../../shared/cycleEngine';
import { generateCycleICS } from '../../shared/icsExport';
import type { AppNotification, NotificationPreferences } from '../../shared/types';
import type { DatabaseService } from '../db/database';

function getCurrentHHMMInTimezone(timezone: string): string {
  try {
    const fmt = new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone || 'UTC',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const parts = fmt.formatToParts(new Date());
    const h = parts.find((p) => p.type === 'hour')?.value || '00';
    const m = parts.find((p) => p.type === 'minute')?.value || '00';
    return `${h === '24' ? '00' : h}:${m}`;
  } catch {
    return new Date().toISOString().slice(11, 16);
  }
}

export class CycleService {
  constructor(private db: DatabaseService) {}

  async getOverview(userId: string) {
    const [user, settings, periods] = await Promise.all([
      this.db.findUserById(userId),
      this.db.getCycleSettings(userId),
      this.db.listPeriods(userId),
    ]);
    const tz = user?.timezone || 'UTC';
    const todayISO = getTodayInTimezone(tz);
    const currentHHMM = getCurrentHHMMInTimezone(tz);
    const overview = calculateCycleOverview(periods, settings, todayISO);

    // Sync timezone-aware in-app & timed reminders based on user's preferences
    await this.syncReminders(userId, todayISO, currentHHMM, overview, settings.notificationPreferences);

    return overview;
  }

  async syncAllDueReminders(userId: string): Promise<AppNotification[]> {
    const [user, settings, periods] = await Promise.all([
      this.db.findUserById(userId),
      this.db.getCycleSettings(userId),
      this.db.listPeriods(userId),
    ]);
    const tz = user?.timezone || 'UTC';
    const todayISO = getTodayInTimezone(tz);
    const currentHHMM = getCurrentHHMMInTimezone(tz);
    const overview = calculateCycleOverview(periods, settings, todayISO);

    return this.syncReminders(
      userId,
      todayISO,
      currentHHMM,
      overview,
      settings.notificationPreferences
    );
  }

  async getCalendar(userId: string, year: number, month: number) {
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

  async exportCalendarICS(
    userId: string,
    options: { cycles?: number; discreet?: boolean; includeFertile?: boolean } = {}
  ) {
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

  async getHistoryAndAnalytics(userId: string) {
    const [settings, periods, symptoms, moods, wellness] = await Promise.all([
      this.db.getCycleSettings(userId),
      this.db.listPeriods(userId),
      this.db.listSymptoms(userId),
      this.db.listMoods(userId),
      this.db.listWellness(userId),
    ]);

    const cycleHistory = buildCycleHistory(periods);
    const completedCycleLengths = cycleHistory
      .map((c) => c.cycleLengthDays)
      .filter((len): len is number => len !== null && len >= 15 && len <= 90);

    const avgCycleLength =
      completedCycleLengths.length > 0
        ? Math.round(
            (completedCycleLengths.reduce((a, b) => a + b, 0) / completedCycleLengths.length) * 10
          ) / 10
        : null;

    const avgPeriodDuration =
      cycleHistory.length > 0
        ? Math.round(
            (cycleHistory.reduce((a, b) => a + b.periodDurationDays, 0) / cycleHistory.length) * 10
          ) / 10
        : null;

    let cycleVariabilityDays: number | null = null;
    if (completedCycleLengths.length >= 2) {
      const mean =
        completedCycleLengths.reduce((a, b) => a + b, 0) / completedCycleLengths.length;
      const variance =
        completedCycleLengths.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) /
        completedCycleLengths.length;
      cycleVariabilityDays = Math.round(Math.sqrt(variance) * 10) / 10;
    }

    // Symptom frequency aggregation
    const symptomCounts = new Map<string, number>();
    for (const entry of symptoms) {
      for (const s of [...entry.physicalSymptoms, ...entry.emotionalSymptoms]) {
        symptomCounts.set(s, (symptomCounts.get(s) || 0) + 1);
      }
    }
    const symptomTrends = Array.from(symptomCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    // Symptom-by-phase breakdown using actual logged cycles
    const metrics = computeCycleMetrics(periods, settings);
    const sortedAsc = [...periods].sort((a, b) => a.startDate.localeCompare(b.startDate));
    const phaseSymptomMap: Record<string, Map<string, number>> = {
      menstrual: new Map(),
      follicular: new Map(),
      ovulation: new Map(),
      luteal: new Map(),
    };

    if (metrics.lastStartDate) {
      for (const entry of symptoms) {
        let anchor = metrics.lastStartDate;
        let len = metrics.estimatedCycleLength;
        for (let i = 0; i < sortedAsc.length; i++) {
          const curr = sortedAsc[i];
          const next = sortedAsc[i + 1];
          if (entry.date >= curr.startDate && (!next || entry.date < next.startDate)) {
            anchor = curr.startDate;
            if (next) {
              const actualLen = diffDaysISO(curr.startDate, next.startDate);
              if (actualLen >= 15 && actualLen <= 90) len = actualLen;
            }
            break;
          }
        }
        if (entry.date >= anchor) {
          const cDay = (diffDaysISO(anchor, entry.date) % len) + 1;
          const { ranges } = computePhaseRanges(len, metrics.estimatedPeriodDuration);
          const phase = determinePhaseForCycleDay(cDay, ranges).phase;
          const bucket = phaseSymptomMap[phase];
          for (const s of [...entry.physicalSymptoms, ...entry.emotionalSymptoms]) {
            bucket.set(s, (bucket.get(s) || 0) + 1);
          }
        }
      }
    }

    const phaseSymptomSummary = Object.entries(phaseSymptomMap).map(([phase, counts]) => ({
      phase,
      topSymptoms: Array.from(counts.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3),
    }));

    // Mood frequency aggregation
    const moodCounts = new Map<string, number>();
    for (const entry of moods) {
      moodCounts.set(entry.mood, (moodCounts.get(entry.mood) || 0) + 1);
    }
    const moodTrends = Array.from(moodCounts.entries())
      .map(([mood, count]) => ({ mood, count }))
      .sort((a, b) => b.count - a.count);

    // Wellness series (chronological, up to last 30 records)
    const wellnessTrends = [...wellness]
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30)
      .map((w) => ({
        date: w.date,
        waterLiters: Math.round((w.waterIntakeMl / 1000) * 100) / 100,
        sleepHours: w.sleepHours,
        activityMinutes: w.physicalActivityMinutes,
        energyLevel: w.energyLevel,
      }));

    return {
      summary: {
        totalLoggedPeriods: periods.length,
        completedCyclesCount: completedCycleLengths.length,
        averageCycleLength: avgCycleLength,
        averagePeriodDuration: avgPeriodDuration,
        cycleVariabilityDays,
        configuredCycleLengthEstimate: settings.averageCycleLength,
        configuredPeriodDurationEstimate: settings.averagePeriodDuration,
      },
      cycleHistory,
      symptomTrends,
      phaseSymptomSummary,
      moodTrends,
      wellnessTrends,
      recentWellnessCount: wellness.length,
    };
  }

  private async syncReminders(
    userId: string,
    todayISO: string,
    currentHHMM: string,
    overview: ReturnType<typeof calculateCycleOverview>,
    prefs: NotificationPreferences
  ): Promise<AppNotification[]> {
    const created: AppNotification[] = [];

    const periodTime = prefs.periodReminderTime || '08:30';
    if (
      prefs.upcomingPeriodReminders &&
      overview.estimatedNextPeriodStart &&
      overview.daysUntilNextPeriod !== null &&
      overview.daysUntilNextPeriod >= 0 &&
      overview.daysUntilNextPeriod <= prefs.periodReminderDaysBefore &&
      currentHHMM >= periodTime
    ) {
      const daysLabel =
        overview.daysUntilNextPeriod === 0
          ? 'today'
          : overview.daysUntilNextPeriod === 1
          ? 'tomorrow'
          : `in ${overview.daysUntilNextPeriod} days`;
      const n = await this.db.ensureNotification(userId, {
        type: 'period_reminder',
        title: 'Upcoming Period Estimate',
        message: `Based on your cycle history, your next period is estimated to begin ${daysLabel} (${overview.estimatedNextPeriodStart}).`,
        scheduledForDate: todayISO,
      });
      if (n) created.push(n);
    }

    const wellnessTime = prefs.wellnessReminderTime || '09:00';
    if (prefs.wellnessReminders && currentHHMM >= wellnessTime) {
      const n = await this.db.ensureNotification(userId, {
        type: 'wellness_reminder',
        title: `${overview.currentPhaseName} Check-In`,
        message: `Theme: ${overview.currentPhaseTheme}. Take a moment today to log your sleep, energy, or mood.`,
        scheduledForDate: todayISO,
      });
      if (n) created.push(n);
    }

    const hydrationTime = prefs.hydrationReminderTime || '14:00';
    if (prefs.hydrationReminders && currentHHMM >= hydrationTime) {
      const n = await this.db.ensureNotification(userId, {
        type: 'hydration_reminder',
        title: 'Hydration Reminder',
        message: 'Remember to sip water or warm herbal tea steadily throughout the day.',
        scheduledForDate: todayISO,
      });
      if (n) created.push(n);
    }

    // Sync user-created custom timed reminders
    const customReminders = await this.db.listCustomReminders(userId);
    for (const rem of customReminders) {
      if (!rem.enabled) continue;
      if (rem.lastTriggeredDate === todayISO) continue;
      if (rem.frequency === 'once') {
        const targetDate = rem.scheduledDate || todayISO;
        if (targetDate !== todayISO) continue;
      }
      if (currentHHMM >= rem.reminderTime) {
        const n = await this.db.ensureNotification(userId, {
          type: 'custom_reminder',
          title: rem.title,
          message:
            rem.message ||
            `Scheduled ${rem.reminderTime} reminder from your Bloom wellness plan.`,
          scheduledForDate: todayISO,
        });
        await this.db.updateCustomReminder(userId, rem.id, {
          lastTriggeredDate: todayISO,
          ...(rem.frequency === 'once' ? { enabled: false } : {}),
        });
        if (n) created.push(n);
      }
    }

    return created;
  }
}
