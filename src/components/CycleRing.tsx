import type { CycleOverview, CyclePhaseId } from '../../shared/types';

const PHASE_COLORS: Record<CyclePhaseId, { stroke: string; label: string }> = {
  menstrual: { stroke: '#B85D74', label: 'Menstrual' },
  follicular: { stroke: '#6E917B', label: 'Follicular' },
  ovulation: { stroke: '#8E78AD', label: 'Ovulation' },
  luteal: { stroke: '#C89B7B', label: 'Luteal' },
};

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function describeArc(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number
) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

export function CycleRing({ overview }: { overview: CycleOverview }) {
  const size = 240;
  const cx = size / 2;
  const cy = size / 2;
  const r = 92;
  const totalDays = Math.max(18, overview.estimatedCycleLength);

  const cycleDay = overview.currentCycleDay
    ? Math.min(overview.currentCycleDay, totalDays)
    : null;
  const dayAngle = cycleDay ? ((cycleDay - 0.5) / totalDays) * 360 : 0;
  const markerPos = cycleDay ? polarToCartesian(cx, cy, r, dayAngle) : null;

  return (
    <div className="flex flex-col items-center">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-label="Menstrual cycle progress ring">
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth="16"
            className="text-[#EDE6DF] dark:text-[#2D2630]"
          />

          {overview.phaseRanges.map((range) => {
            const startAngle = ((range.startDay - 1) / totalDays) * 360 + 2;
            const endAngle = (range.endDay / totalDays) * 360 - 2;
            if (endAngle <= startAngle) return null;
            const isActive = overview.currentPhase === range.phase;
            return (
              <path
                key={range.phase}
                d={describeArc(cx, cy, r, startAngle, endAngle)}
                fill="none"
                stroke={PHASE_COLORS[range.phase].stroke}
                strokeWidth={isActive ? 18 : 14}
                strokeLinecap="round"
                strokeOpacity={isActive ? 1 : 0.48}
              />
            );
          })}

          {markerPos && (
            <>
              <circle
                cx={markerPos.x}
                cy={markerPos.y}
                r={9}
                className="fill-[#FAF8F6] dark:fill-[#1D191F]"
                stroke={PHASE_COLORS[overview.currentPhase].stroke}
                strokeWidth={3.5}
              />
            </>
          )}
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
          <span className="text-xs font-medium text-[#6E5D66] dark:text-[#B5A7B0]">
            {overview.currentCycleDay ? 'Estimated Cycle Day' : 'Cycle Status'}
          </span>
          <span className="font-display text-4xl font-semibold text-[#2B2328] dark:text-[#F4EEF2] tabular-nums mt-0.5">
            {overview.currentCycleDay ? `Day ${overview.currentCycleDay}` : '—'}
          </span>
          <span className="text-sm font-medium text-[#9D4E63] dark:text-[#E097AA] mt-1">
            {overview.currentPhaseName}
          </span>
          {overview.daysUntilNextPeriod !== null && (
            <span className="text-xs text-[#6E5D66] dark:text-[#B5A7B0] tabular-nums mt-1">
              {overview.daysUntilNextPeriod === 0
                ? 'Est. period today'
                : overview.daysUntilNextPeriod === 1
                ? '1 day until est. period'
                : `${overview.daysUntilNextPeriod} days until est. period`}
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs text-[#594B53] dark:text-[#C5B8C0]">
        {overview.phaseRanges.map((p) => (
          <div key={p.phase} className="flex items-center gap-2">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
              style={{ backgroundColor: PHASE_COLORS[p.phase].stroke }}
              aria-hidden="true"
            />
            <span className="whitespace-nowrap">
              {PHASE_COLORS[p.phase].label} (D{p.startDay}–{p.endDay})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
