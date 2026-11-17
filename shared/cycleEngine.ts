import {
  CalendarDayInfo,
  CycleHistoryItem,
  CycleOverview,
  CyclePhaseId,
  CyclePhaseRange,
  CycleSettingsDTO,
  MoodEntry,
  PeriodRecord,
  SymptomEntry,
  WellnessEntry,
} from './types';
import { PHASE_NUTRITION_CONTENT } from './nutritionData';

export const PREDICTION_DISCLAIMER =
  'Predictions in Bloom are statistical estimates based on your logged history and settings. They are not medical advice and must not be relied upon for contraception, fertility planning, or pregnancy prevention.';

export function parseISODateUTC(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function formatISODateUTC(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDaysISO(dateStr: string, days: number): string {
  const dt = parseISODateUTC(dateStr);
  dt.setUTCDate(dt.getUTCDate() + days);
  return formatISODateUTC(dt);
}

export function diffDaysISO(startStr: string, endStr: string): number {
  const a = parseISODateUTC(startStr).getTime();
  const b = parseISODateUTC(endStr).getTime();
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

export function getTodayInTimezone(timezone: string): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone || 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = formatter.formatToParts(new Date());
    const y = parts.find((p) => p.type === 'year')?.value;
    const m = parts.find((p) => p.type === 'month')?.value;
    const d = parts.find((p) => p.type === 'day')?.value;
    if (y && m && d) return `${y}-${m}-${d}`;
  } catch {
    // Fallback to UTC if timezone string is unrecognized
  }
  return formatISODateUTC(new Date());
}

/**
 * Dynamically computes phase day ranges for any cycle length and period duration.
 * Does NOT hardcode 28 days or Day 14 ovulation.
 * Uses physiological luteal anchor (~14 days before next period, clamped proportionally for very short/long cycles).
 */
export function computePhaseRanges(
  cycleLength: number,
  periodDuration: number
): { ranges: CyclePhaseRange[]; ovulationDay: number } {
  const safeCycle = Math.max(18, Math.min(60, Math.round(cycleLength)));
  const safePeriod = Math.max(1, Math.min(Math.max(1, safeCycle - 6), Math.round(periodDuration)));

  // Luteal phase tends to be 12–15 days (avg ~14) prior to next period,
  // while ensuring ovulation does not precede the menstrual phase.
  const lutealAnchor = safeCycle <= 23 ? Math.max(10, Math.round(safeCycle * 0.45)) : 14;
  const rawOvulationDay = safeCycle - lutealAnchor;
  const ovulationDay = Math.max(safePeriod + 2, Math.min(safeCycle - 4, rawOvulationDay));

  const menstrualEnd = safePeriod;
  const ovulationStart = Math.max(menstrualEnd + 1, ovulationDay - 1);
  const ovulationEnd = Math.min(safeCycle - 2, ovulationDay + 1);
  const follicularStart = menstrualEnd + 1;
  const follicularEnd = Math.max(follicularStart, ovulationStart - 1);
  const lutealStart = ovulationEnd + 1;

  const ranges: CyclePhaseRange[] = [
    {
      phase: 'menstrual',
      name: 'Menstrual Phase',
      theme: 'Rest and Restore',
      startDay: 1,
      endDay: menstrualEnd,
    },
    {
      phase: 'follicular',
      name: 'Follicular Phase',
      theme: 'Rise and Renew',
      startDay: follicularStart,
      endDay: follicularEnd,
    },
    {
      phase: 'ovulation',
      name: 'Ovulation Phase',
      theme: 'Shine and Connect',
      startDay: ovulationStart,
      endDay: ovulationEnd,
    },
    {
      phase: 'luteal',
      name: 'Luteal Phase',
      theme: 'Slow and Steady',
      startDay: lutealStart,
      endDay: safeCycle,
    },
  ];

  return { ranges, ovulationDay };
}

export function determinePhaseForCycleDay(
  cycleDay: number,
  ranges: CyclePhaseRange[]
): CyclePhaseRange {
  for (const r of ranges) {
    if (cycleDay >= r.startDay && cycleDay <= r.endDay) {
      return r;
    }
  }
  return ranges[ranges.length - 1];
}

export function buildCycleHistory(periods: PeriodRecord[]): CycleHistoryItem[] {
  const sortedAsc = [...periods].sort((a, b) => a.startDate.localeCompare(b.startDate));
  return sortedAsc.map((p, idx) => {
    const duration = Math.max(1, diffDaysISO(p.startDate, p.endDate) + 1);
    const nextPeriod = sortedAsc[idx + 1];
    const cycleLengthDays = nextPeriod ? diffDaysISO(p.startDate, nextPeriod.startDate) : null;
    return {
      cycleNumber: idx + 1,
      startDate: p.startDate,
      endDate: p.endDate,
      periodDurationDays: duration,
      cycleLengthDays,
      flowIntensity: p.flowIntensity,
    };
  });
}

export function computeCycleMetrics(
  periods: PeriodRecord[],
  settings: Pick<
    CycleSettingsDTO,
    'averageCycleLength' | 'averagePeriodDuration' | 'lastPeriodStartDate' | 'cycleRegularity'
  >
): {
  estimatedCycleLength: number;
  estimatedPeriodDuration: number;
  cycleVariabilityDays: number | null;
  isIrregularPattern: boolean;
  completedCyclesCount: number;
  lastStartDate: string | null;
  lastLoggedPeriod: PeriodRecord | null;
  dataConfidence: 'limited' | 'moderate' | 'high';
  isEstimate: boolean;
} {
  const sortedDesc = [...periods].sort((a, b) => b.startDate.localeCompare(a.startDate));
  const history = buildCycleHistory(periods);

  // Use valid consecutive cycle intervals (between 15 and 90 days to avoid multi-month missed logs skewing completely, while still handling long/irregular cycles)
  const completedLengths = history
    .map((h) => h.cycleLengthDays)
    .filter((len): len is number => len !== null && len >= 15 && len <= 90);

  const periodDurations = history.map((h) => h.periodDurationDays);

  const estimatedCycleLength =
    completedLengths.length > 0
      ? Math.round(completedLengths.reduce((acc, v) => acc + v, 0) / completedLengths.length)
      : settings.averageCycleLength || 29;

  const estimatedPeriodDuration =
    periodDurations.length > 0
      ? Math.round(periodDurations.reduce((acc, v) => acc + v, 0) / periodDurations.length)
      : settings.averagePeriodDuration || 5;

  let cycleVariabilityDays: number | null = null;
  if (completedLengths.length >= 2) {
    const mean = completedLengths.reduce((a, b) => a + b, 0) / completedLengths.length;
    const variance =
      completedLengths.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) /
      completedLengths.length;
    cycleVariabilityDays = Math.round(Math.sqrt(variance) * 10) / 10;
  } else if (completedLengths.length === 1) {
    cycleVariabilityDays = 0;
  }

  const hasOutOfTypicalRange = completedLengths.some((len) => len < 21 || len > 35);
  const isIrregularPattern =
    settings.cycleRegularity === 'irregular' ||
    (cycleVariabilityDays !== null && cycleVariabilityDays > 7) ||
    hasOutOfTypicalRange;

  const dataConfidence: 'limited' | 'moderate' | 'high' =
    completedLengths.length >= 4 ? 'high' : completedLengths.length >= 2 ? 'moderate' : 'limited';

  const lastLoggedPeriod = sortedDesc[0] || null;
  const lastStartDate = lastLoggedPeriod?.startDate || settings.lastPeriodStartDate || null;

  return {
    estimatedCycleLength,
    estimatedPeriodDuration,
    cycleVariabilityDays,
    isIrregularPattern,
    completedCyclesCount: completedLengths.length,
    lastStartDate,
    lastLoggedPeriod,
    dataConfidence,
    isEstimate: true,
  };
}

export function calculateCycleOverview(
  periods: PeriodRecord[],
  settings: Pick<
    CycleSettingsDTO,
    'averageCycleLength' | 'averagePeriodDuration' | 'lastPeriodStartDate' | 'cycleRegularity'
  >,
  referenceDateISO: string
): CycleOverview {
  const metrics = computeCycleMetrics(periods, settings);
  const { ranges, ovulationDay } = computePhaseRanges(
    metrics.estimatedCycleLength,
    metrics.estimatedPeriodDuration
  );

  if (!metrics.lastStartDate) {
    const defaultPhase = PHASE_NUTRITION_CONTENT[1]; // Follicular neutral overview
    return {
      hasSufficientData: false,
      isEstimate: true,
      dataConfidence: 'limited',
      currentDate: referenceDateISO,
      currentCycleDay: null,
      estimatedCycleLength: metrics.estimatedCycleLength,
      estimatedPeriodDuration: metrics.estimatedPeriodDuration,
      cycleVariabilityDays: metrics.cycleVariabilityDays,
      isIrregularPattern: metrics.isIrregularPattern,
      currentPhase: defaultPhase.phase,
      currentPhaseName: defaultPhase.title,
      currentPhaseTheme: defaultPhase.theme,
      currentPhaseDescription:
        'Log your first period or set a last period date in Cycle Settings to see personalized cycle day and phase estimates.',
      lastLoggedPeriod: null,
      estimatedNextPeriodStart: null,
      estimatedNextPeriodEnd: null,
      daysUntilNextPeriod: null,
      estimatedOvulationDate: null,
      estimatedFertileWindowStart: null,
      estimatedFertileWindowEnd: null,
      phaseRanges: ranges,
      completedCyclesCount: 0,
      predictionDisclaimer: PREDICTION_DISCLAIMER,
    };
  }

  const daysSinceLastStart = diffDaysISO(metrics.lastStartDate, referenceDateISO);

  // Project forward cycles if referenceDate is past the estimated cycle length
  let activeCycleStart = metrics.lastStartDate;
  if (daysSinceLastStart >= metrics.estimatedCycleLength) {
    const cyclesElapsed = Math.floor(daysSinceLastStart / metrics.estimatedCycleLength);
    activeCycleStart = addDaysISO(
      metrics.lastStartDate,
      cyclesElapsed * metrics.estimatedCycleLength
    );
  }

  const rawCycleDay = diffDaysISO(activeCycleStart, referenceDateISO) + 1;
  const currentCycleDay = Math.max(1, rawCycleDay);

  // Check if user is actively inside a logged period on referenceDateISO
  const activeLoggedPeriod = periods.find(
    (p) => referenceDateISO >= p.startDate && referenceDateISO <= p.endDate
  );

  let currentPhaseRange = determinePhaseForCycleDay(currentCycleDay, ranges);
  if (activeLoggedPeriod) {
    currentPhaseRange = ranges[0]; // Menstrual
  }

  const phaseContent =
    PHASE_NUTRITION_CONTENT.find((p) => p.phase === currentPhaseRange.phase) ||
    PHASE_NUTRITION_CONTENT[0];

  // Next estimated period start from activeCycleStart
  let estimatedNextPeriodStart = addDaysISO(activeCycleStart, metrics.estimatedCycleLength);
  if (diffDaysISO(referenceDateISO, estimatedNextPeriodStart) < 0) {
    estimatedNextPeriodStart = addDaysISO(estimatedNextPeriodStart, metrics.estimatedCycleLength);
  }
  const estimatedNextPeriodEnd = addDaysISO(
    estimatedNextPeriodStart,
    metrics.estimatedPeriodDuration - 1
  );
  const daysUntilNextPeriod = diffDaysISO(referenceDateISO, estimatedNextPeriodStart);

  // Ovulation & fertile window for the active cycle (or upcoming cycle if already passed)
  let cycleAnchorForOvulation = activeCycleStart;
  let estimatedOvulationDate = addDaysISO(cycleAnchorForOvulation, ovulationDay - 1);
  if (diffDaysISO(referenceDateISO, estimatedOvulationDate) < -2) {
    cycleAnchorForOvulation = estimatedNextPeriodStart;
    estimatedOvulationDate = addDaysISO(cycleAnchorForOvulation, ovulationDay - 1);
  }
  const estimatedFertileWindowStart = addDaysISO(estimatedOvulationDate, -5);
  const estimatedFertileWindowEnd = addDaysISO(estimatedOvulationDate, 1);

  return {
    hasSufficientData: periods.length > 0 || Boolean(settings.lastPeriodStartDate),
    isEstimate: true,
    dataConfidence: metrics.dataConfidence,
    currentDate: referenceDateISO,
    currentCycleDay,
    estimatedCycleLength: metrics.estimatedCycleLength,
    estimatedPeriodDuration: metrics.estimatedPeriodDuration,
    cycleVariabilityDays: metrics.cycleVariabilityDays,
    isIrregularPattern: metrics.isIrregularPattern,
    currentPhase: currentPhaseRange.phase,
    currentPhaseName: phaseContent.title,
    currentPhaseTheme: phaseContent.theme,
    currentPhaseDescription: phaseContent.shortDescription,
    lastLoggedPeriod: metrics.lastLoggedPeriod,
    estimatedNextPeriodStart,
    estimatedNextPeriodEnd,
    daysUntilNextPeriod,
    estimatedOvulationDate,
    estimatedFertileWindowStart,
    estimatedFertileWindowEnd,
    phaseRanges: ranges,
    completedCyclesCount: metrics.completedCyclesCount,
    predictionDisclaimer: PREDICTION_DISCLAIMER,
  };
}

export function buildCalendarMonth(params: {
  year: number;
  month: number; // 1-12
  todayISO: string;
  periods: PeriodRecord[];
  settings: Pick<
    CycleSettingsDTO,
    'averageCycleLength' | 'averagePeriodDuration' | 'lastPeriodStartDate' | 'cycleRegularity'
  >;
  symptoms: SymptomEntry[];
  moods: MoodEntry[];
  wellness: WellnessEntry[];
}): CalendarMonthResponseLike {
  const { year, month, todayISO, periods, settings, symptoms, moods, wellness } = params;
  const metrics = computeCycleMetrics(periods, settings);
  const { ranges, ovulationDay } = computePhaseRanges(
    metrics.estimatedCycleLength,
    metrics.estimatedPeriodDuration
  );

  const firstDayOfMonth = new Date(Date.UTC(year, month - 1, 1));
  const startWeekday = firstDayOfMonth.getUTCDay(); // 0=Sun
  const gridStart = new Date(Date.UTC(year, month - 1, 1 - startWeekday));

  const symptomDates = new Set(symptoms.map((s) => s.date));
  const moodByDate = new Map(moods.map((m) => [m.date, m.mood]));
  const wellnessDates = new Set(wellness.map((w) => w.date));

  // Build projected estimated period, fertile, and ovulation dates around the viewed month
  const estimatedPeriodDates = new Set<string>();
  const estimatedFertileDates = new Set<string>();
  const estimatedOvulationDates = new Set<string>();

  if (metrics.lastStartDate) {
    const monthStartISO = formatISODateUTC(gridStart);
    const gridEndDate = new Date(gridStart);
    gridEndDate.setUTCDate(gridEndDate.getUTCDate() + 41);
    const monthEndISO = formatISODateUTC(gridEndDate);

    // Project up to 24 cycles forward from lastStartDate (never overwrite confirmed logged periods)
    const diffToStart = diffDaysISO(metrics.lastStartDate, monthStartISO);
    const startCycleIndex = Math.max(0, Math.floor(diffToStart / metrics.estimatedCycleLength) - 1);
    const maxCycles = startCycleIndex + 6;

    for (let c = startCycleIndex; c <= maxCycles; c++) {
      const cycleStart = addDaysISO(metrics.lastStartDate, c * metrics.estimatedCycleLength);
      if (cycleStart > monthEndISO) break;

      // Estimated period (only project future cycles where c >= 1, or if c === 0 and no logged period covers those days)
      if (c >= 1 || periods.length === 0) {
        for (let d = 0; d < metrics.estimatedPeriodDuration; d++) {
          estimatedPeriodDates.add(addDaysISO(cycleStart, d));
        }
      }

      const ovDate = addDaysISO(cycleStart, ovulationDay - 1);
      estimatedOvulationDates.add(ovDate);
      for (let f = -5; f <= 1; f++) {
        estimatedFertileDates.add(addDaysISO(ovDate, f));
      }
    }
  }

  const days: CalendarDayInfo[] = [];
  for (let i = 0; i < 42; i++) {
    const current = new Date(gridStart);
    current.setUTCDate(gridStart.getUTCDate() + i);
    const dateISO = formatISODateUTC(current);
    const inCurrentMonth = current.getUTCMonth() === month - 1;

    const matchingPeriod = periods.find(
      (p) => dateISO >= p.startDate && dateISO <= p.endDate
    );

    let cycleDay: number | null = null;
    let estimatedPhase: CyclePhaseId | null = null;

    const sortedPeriodsAsc = [...periods].sort((a, b) => a.startDate.localeCompare(b.startDate));
    let anchorStart: string | null = null;
    let anchorLength = metrics.estimatedCycleLength;

    for (let pIdx = 0; pIdx < sortedPeriodsAsc.length; pIdx++) {
      const curr = sortedPeriodsAsc[pIdx];
      const next = sortedPeriodsAsc[pIdx + 1];
      if (dateISO >= curr.startDate && (!next || dateISO < next.startDate)) {
        anchorStart = curr.startDate;
        if (next) {
          const actualLen = diffDaysISO(curr.startDate, next.startDate);
          if (actualLen >= 15 && actualLen <= 90) {
            anchorLength = actualLen;
          }
        }
        break;
      }
    }

    if (!anchorStart && metrics.lastStartDate && dateISO >= metrics.lastStartDate) {
      anchorStart = metrics.lastStartDate;
    }

    if (anchorStart) {
      const daysDiff = diffDaysISO(anchorStart, dateISO);
      cycleDay = (daysDiff % anchorLength) + 1;
      const { ranges: localRanges } = computePhaseRanges(
        anchorLength,
        metrics.estimatedPeriodDuration
      );
      estimatedPhase = determinePhaseForCycleDay(cycleDay, localRanges).phase;
    }

    if (matchingPeriod) {
      estimatedPhase = 'menstrual';
    }

    days.push({
      date: dateISO,
      dayOfMonth: current.getUTCDate(),
      inCurrentMonth,
      isToday: dateISO === todayISO,
      isLoggedPeriod: Boolean(matchingPeriod),
      loggedPeriodFlow: matchingPeriod ? matchingPeriod.flowIntensity : null,
      isEstimatedPeriod: !matchingPeriod && estimatedPeriodDates.has(dateISO),
      isEstimatedFertile: !matchingPeriod && estimatedFertileDates.has(dateISO),
      isEstimatedOvulation: !matchingPeriod && estimatedOvulationDates.has(dateISO),
      estimatedPhase,
      cycleDay,
      hasSymptoms: symptomDates.has(dateISO),
      mood: moodByDate.get(dateISO) || null,
      hasWellness: wellnessDates.has(dateISO),
    });
  }

  return {
    year,
    month,
    days,
    disclaimer: PREDICTION_DISCLAIMER,
  };
}

interface CalendarMonthResponseLike {
  year: number;
  month: number;
  days: CalendarDayInfo[];
  disclaimer: string;
}
