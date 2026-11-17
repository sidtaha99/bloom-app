import {
  buildCalendarMonth,
  buildCycleHistory,
  calculateCycleOverview,
  computeCycleMetrics,
  computePhaseRanges,
  determinePhaseForCycleDay,
  diffDaysISO,
  addDaysISO,
  PREDICTION_DISCLAIMER,
} from './cycleEngine';
import type { CyclePhaseId, CycleSettingsDTO, PeriodRecord } from './types';

export interface CycleScheduleEvent {
  uid: string;
  title: string;
  discreetTitle: string;
  description: string;
  startDate: string; // YYYY-MM-DD
  endDateExclusive: string; // YYYY-MM-DD (RFC 5545 all-day DTEND is exclusive)
  phase: CyclePhaseId | 'fertile' | 'ovulation_day';
}

function formatICSDate(isoDate: string): string {
  return isoDate.replace(/-/g, '');
}

function formatICSTimestampUTC(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function escapeICSText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}

/**
 * Generates upcoming estimated cycle phase events for the next N cycles.
 */
export function buildUpcomingCycleSchedule(
  periods: PeriodRecord[],
  settings: Pick<
    CycleSettingsDTO,
    'averageCycleLength' | 'averagePeriodDuration' | 'lastPeriodStartDate' | 'cycleRegularity'
  >,
  referenceDateISO: string,
  cyclesCount = 3
): CycleScheduleEvent[] {
  const overview = calculateCycleOverview(periods, settings, referenceDateISO);
  if (!overview.estimatedNextPeriodStart) {
    return [];
  }

  const metrics = computeCycleMetrics(periods, settings);
  const { ranges, ovulationDay } = computePhaseRanges(
    metrics.estimatedCycleLength,
    metrics.estimatedPeriodDuration
  );

  const safeCycles = Math.max(1, Math.min(12, Math.round(cyclesCount)));
  const events: CycleScheduleEvent[] = [];

  // Include remainder of active cycle if we have a start date, plus next N cycles
  const startAnchor = overview.estimatedNextPeriodStart;

  for (let c = 0; c < safeCycles; c++) {
    const cycleStart = addDaysISO(startAnchor, c * metrics.estimatedCycleLength);
    const cycleLabel = `Cycle ${c + 1}`;

    for (const r of ranges) {
      const startDate = addDaysISO(cycleStart, r.startDay - 1);
      const endDateInclusive = addDaysISO(cycleStart, r.endDay - 1);
      const endDateExclusive = addDaysISO(endDateInclusive, 1);

      const discreetMap: Record<CyclePhaseId, string> = {
        menstrual: 'Bloom · Phase 1 (Rest)',
        follicular: 'Bloom · Phase 2 (Renew)',
        ovulation: 'Bloom · Phase 3 (Connect)',
        luteal: 'Bloom · Phase 4 (Steady)',
      };

      const fullMap: Record<CyclePhaseId, string> = {
        menstrual: 'Bloom: Menstrual Phase (Est.)',
        follicular: 'Bloom: Follicular Phase (Est.)',
        ovulation: 'Bloom: Ovulation Phase (Est.)',
        luteal: 'Bloom: Luteal Phase (Est.)',
      };

      events.push({
        uid: `bloom-${r.phase}-${cycleStart}@bloom.wellness`,
        title: fullMap[r.phase],
        discreetTitle: discreetMap[r.phase],
        description: `${r.name} — Theme: ${r.theme} (${cycleLabel}, Est. Days ${r.startDay}-${r.endDay} of ${metrics.estimatedCycleLength}). ${PREDICTION_DISCLAIMER}`,
        startDate,
        endDateExclusive,
        phase: r.phase,
      });
    }

    // Also add fertile window & ovulation day estimate markers
    const ovDate = addDaysISO(cycleStart, ovulationDay - 1);
    const fertileStart = addDaysISO(ovDate, -5);
    const fertileEndExclusive = addDaysISO(ovDate, 2);

    events.push({
      uid: `bloom-fertile-${cycleStart}@bloom.wellness`,
      title: 'Bloom: Estimated Fertile Window',
      discreetTitle: 'Bloom · Focus Window',
      description: `Estimated fertile window (${fertileStart} to ${addDaysISO(ovDate, 1)}). ${PREDICTION_DISCLAIMER}`,
      startDate: fertileStart,
      endDateExclusive: fertileEndExclusive,
      phase: 'fertile',
    });

    events.push({
      uid: `bloom-ovday-${cycleStart}@bloom.wellness`,
      title: 'Bloom: Estimated Ovulation Day',
      discreetTitle: 'Bloom · Mid-Cycle Peak',
      description: `Estimated ovulation date based on your ${metrics.estimatedCycleLength}-day cycle estimate. ${PREDICTION_DISCLAIMER}`,
      startDate: ovDate,
      endDateExclusive: addDaysISO(ovDate, 1),
      phase: 'ovulation_day',
    });
  }

  return events.sort((a, b) => a.startDate.localeCompare(b.startDate));
}

export function generateCycleICS(params: {
  periods: PeriodRecord[];
  settings: Pick<
    CycleSettingsDTO,
    'averageCycleLength' | 'averagePeriodDuration' | 'lastPeriodStartDate' | 'cycleRegularity'
  >;
  referenceDateISO: string;
  cyclesCount?: number;
  discreetMode?: boolean;
  includeFertileWindow?: boolean;
}): { icsContent: string; eventCount: number } {
  const {
    periods,
    settings,
    referenceDateISO,
    cyclesCount = 3,
    discreetMode = false,
    includeFertileWindow = true,
  } = params;

  const allEvents = buildUpcomingCycleSchedule(
    periods,
    settings,
    referenceDateISO,
    cyclesCount
  );

  const filtered = includeFertileWindow
    ? allEvents
    : allEvents.filter((e) => e.phase !== 'fertile' && e.phase !== 'ovulation_day');

  const dtstamp = formatICSTimestampUTC(new Date());
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Bloom Wellness//Menstrual Cycle Schedule//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${discreetMode ? 'Bloom Schedule' : 'Bloom Cycle Phases (Estimates)'}`,
  ];

  for (const ev of filtered) {
    const summary = discreetMode ? ev.discreetTitle : ev.title;
    lines.push(
      'BEGIN:VEVENT',
      `UID:${ev.uid}`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART;VALUE=DATE:${formatICSDate(ev.startDate)}`,
      `DTEND;VALUE=DATE:${formatICSDate(ev.endDateExclusive)}`,
      `SUMMARY:${escapeICSText(summary)}`,
      `DESCRIPTION:${escapeICSText(ev.description)}`,
      'TRANSP:TRANSPARENT',
      'STATUS:TENTATIVE',
      'END:VEVENT'
    );
  }

  lines.push('END:VCALENDAR');

  // RFC 5545 requires CRLF line endings
  return {
    icsContent: lines.join('\r\n') + '\r\n',
    eventCount: filtered.length,
  };
}

// Re-export helpers so callers can use one import if desired
export {
  buildCalendarMonth,
  buildCycleHistory,
  calculateCycleOverview,
  computeCycleMetrics,
  computePhaseRanges,
  determinePhaseForCycleDay,
  diffDaysISO,
};
