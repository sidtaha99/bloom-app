import { describe, expect, it } from 'vitest';
import {
  buildCalendarMonth,
  calculateCycleOverview,
  computeCycleMetrics,
  computePhaseRanges,
} from '../shared/cycleEngine';
import { generateCycleICS } from '../shared/icsExport';
import type { CycleSettingsDTO, PeriodRecord } from '../shared/types';

const baseSettings: Pick<
  CycleSettingsDTO,
  'averageCycleLength' | 'averagePeriodDuration' | 'lastPeriodStartDate' | 'cycleRegularity'
> = {
  averageCycleLength: 31,
  averagePeriodDuration: 5,
  lastPeriodStartDate: null,
  cycleRegularity: 'regular',
};

function makePeriod(id: string, startDate: string, endDate: string): PeriodRecord {
  return {
    id,
    userId: 'u1',
    startDate,
    endDate,
    flowIntensity: 'medium',
    notes: '',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };
}

describe('Bloom Cycle Calculation Engine', () => {
  it('never assumes 28 days or Day 14 ovulation for longer cycles', () => {
    const { ranges, ovulationDay } = computePhaseRanges(33, 5);
    expect(ovulationDay).toBe(19); // 33 - 14
    const ovRange = ranges.find((r) => r.phase === 'ovulation');
    expect(ovRange).toEqual({
      phase: 'ovulation',
      name: 'Ovulation Phase',
      theme: 'Shine and Connect',
      startDay: 18,
      endDay: 20,
    });
    const luteal = ranges.find((r) => r.phase === 'luteal');
    expect(luteal?.endDay).toBe(33);
  });

  it('computes actual average cycle length and duration from logged periods', () => {
    const periods: PeriodRecord[] = [
      makePeriod('1', '2026-01-01', '2026-01-05'), // 5 days
      makePeriod('2', '2026-02-02', '2026-02-06'), // 32 day cycle, 5 days
      makePeriod('3', '2026-03-04', '2026-03-07'), // 30 day cycle, 4 days
    ];
    const metrics = computeCycleMetrics(periods, baseSettings);
    expect(metrics.estimatedCycleLength).toBe(31);
    expect(metrics.estimatedPeriodDuration).toBe(5);
    expect(metrics.completedCyclesCount).toBe(2);
    expect(metrics.isIrregularPattern).toBe(false);
    expect(metrics.dataConfidence).toBe('moderate');
  });

  it('detects irregular cycles when cycle lengths vary widely', () => {
    const periods: PeriodRecord[] = [
      makePeriod('1', '2026-01-01', '2026-01-05'),
      makePeriod('2', '2026-01-22', '2026-01-26'), // 21 days
      makePeriod('3', '2026-03-05', '2026-03-09'), // 42 days
    ];
    const metrics = computeCycleMetrics(periods, baseSettings);
    expect(metrics.isIrregularPattern).toBe(true);
    expect(metrics.cycleVariabilityDays).toBeGreaterThan(7);
  });

  it('handles insufficient historical data safely with clear estimate flags', () => {
    const overview = calculateCycleOverview([], baseSettings, '2026-05-10');
    expect(overview.hasSufficientData).toBe(false);
    expect(overview.isEstimate).toBe(true);
    expect(overview.currentCycleDay).toBeNull();
    expect(overview.predictionDisclaimer).toContain('not be relied upon for contraception');
  });

  it('calculates current cycle day, phase, next period, and ovulation from recent period', () => {
    const periods: PeriodRecord[] = [
      makePeriod('1', '2026-04-01', '2026-04-05'),
      makePeriod('2', '2026-05-01', '2026-05-05'), // 30-day cycle
    ];
    const overview = calculateCycleOverview(periods, baseSettings, '2026-05-16');
    expect(overview.currentCycleDay).toBe(16);
    expect(overview.estimatedCycleLength).toBe(30);
    expect(overview.estimatedNextPeriodStart).toBe('2026-05-31');
    expect(overview.daysUntilNextPeriod).toBe(15);
    expect(overview.estimatedOvulationDate).toBe('2026-05-16'); // Day 16 of 30-day cycle (30-14)
    expect(overview.currentPhase).toBe('ovulation');
  });

  it('distinguishes confirmed period days from predicted period and fertile dates on calendar', () => {
    const periods: PeriodRecord[] = [
      makePeriod('1', '2026-04-01', '2026-04-05'),
      makePeriod('2', '2026-05-01', '2026-05-05'),
    ];
    const calendar = buildCalendarMonth({
      year: 2026,
      month: 5,
      todayISO: '2026-05-10',
      periods,
      settings: baseSettings,
      symptoms: [],
      moods: [],
      wellness: [],
    });

    const may2 = calendar.days.find((d) => d.date === '2026-05-02')!;
    expect(may2.isLoggedPeriod).toBe(true);
    expect(may2.isEstimatedPeriod).toBe(false);

    const may16 = calendar.days.find((d) => d.date === '2026-05-16')!;
    expect(may16.isEstimatedOvulation).toBe(true);
    expect(may16.isEstimatedFertile).toBe(true);

    const may31 = calendar.days.find((d) => d.date === '2026-05-31')!;
    expect(may31.isLoggedPeriod).toBe(false);
    expect(may31.isEstimatedPeriod).toBe(true);
  });

  it('generates valid RFC 5545 .ics calendar events from upcoming cycle phase predictions', () => {
    const periods: PeriodRecord[] = [
      makePeriod('1', '2026-04-01', '2026-04-05'),
      makePeriod('2', '2026-05-01', '2026-05-05'),
    ];
    const { icsContent, eventCount } = generateCycleICS({
      periods,
      settings: baseSettings,
      referenceDateISO: '2026-05-10',
      cyclesCount: 2,
      discreetMode: false,
      includeFertileWindow: true,
    });

    // 2 cycles * (4 phase events + fertile window + ovulation day) = 12 events
    expect(eventCount).toBe(12);
    expect(icsContent).toContain('BEGIN:VCALENDAR\r\n');
    expect(icsContent).toContain('DTSTART;VALUE=DATE:20260531\r\n');
    expect(icsContent).toContain('SUMMARY:Bloom: Menstrual Phase (Est.)\r\n');
    expect(icsContent).toContain('SUMMARY:Bloom: Follicular Phase (Est.)\r\n');
    expect(icsContent).toContain('SUMMARY:Bloom: Ovulation Phase (Est.)\r\n');
    expect(icsContent).toContain('SUMMARY:Bloom: Luteal Phase (Est.)\r\n');
    expect(icsContent).toContain('END:VCALENDAR\r\n');
  });
});
