import { Download } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { CycleHistoryItem } from '../../shared/types';
import { useTheme } from '../context/ThemeContext';
import { downloadFileFromApi, apiFetch } from '../lib/api';

interface HistoryResponse {
  summary: {
    totalLoggedPeriods: number;
    completedCyclesCount: number;
    averageCycleLength: number | null;
    averagePeriodDuration: number | null;
    cycleVariabilityDays: number | null;
    configuredCycleLengthEstimate: number;
    configuredPeriodDurationEstimate: number;
  };
  cycleHistory: CycleHistoryItem[];
  symptomTrends: { name: string; count: number }[];
  phaseSymptomSummary?: { phase: string; topSymptoms: { name: string; count: number }[] }[];
  moodTrends: { mood: string; count: number }[];
  wellnessTrends?: {
    date: string;
    waterLiters: number;
    sleepHours: number;
    activityMinutes: number;
    energyLevel: number;
  }[];
  recentWellnessCount: number;
}

export function InsightsPage() {
  const { theme } = useTheme();
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [exportErr, setExportErr] = useState('');

  useEffect(() => {
    apiFetch<HistoryResponse>('/api/cycle/history')
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  const cycleLengthChartData = (data?.cycleHistory || [])
    .filter((c) => c.cycleLengthDays !== null)
    .map((c) => ({
      label: c.startDate,
      cycleLength: c.cycleLengthDays,
    }));

  const periodDurationChartData = (data?.cycleHistory || []).map((c) => ({
    label: c.startDate,
    durationDays: c.periodDurationDays,
  }));

  const tooltipStyle =
    theme === 'dark'
      ? {
          backgroundColor: '#1D191F',
          borderColor: '#352E38',
          color: '#F4EEF2',
          borderRadius: '12px',
          fontSize: '12px',
        }
      : {
          backgroundColor: '#FFFFFF',
          borderColor: '#E6DFD7',
          color: '#2B2328',
          borderRadius: '12px',
          fontSize: '12px',
        };

  const handleExport = async (format: 'json' | 'csv') => {
    setExportErr('');
    try {
      await downloadFileFromApi(
        `/api/profile/export?format=${format}`,
        `bloom-personal-export.${format}`
      );
    } catch (err) {
      setExportErr(err instanceof Error ? err.message : 'Unable to export data');
    }
  };

  if (loading) {
    return <div className="h-72 rounded-2xl bg-[#EAE3DC] dark:bg-[#262129] animate-pulse" />;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">Insights & Cycle History</h1>
          <p className="mt-1 text-sm text-[#594B53] dark:text-[#BFB2BA]">
            Charts and statistics computed strictly from your recorded database entries—never invented numbers.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => handleExport('csv')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#DFD6CE] dark:border-[#3C333F] bg-[#FFFFFF] dark:bg-[#1D191F] text-xs font-medium hover:bg-[#F5F0EC] dark:hover:bg-[#262129] cursor-pointer whitespace-nowrap"
          >
            <Download className="h-3.5 w-3.5" /> Export CSV
          </button>
          <button
            type="button"
            onClick={() => handleExport('json')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#DFD6CE] dark:border-[#3C333F] bg-[#FFFFFF] dark:bg-[#1D191F] text-xs font-medium hover:bg-[#F5F0EC] dark:hover:bg-[#262129] cursor-pointer whitespace-nowrap"
          >
            <Download className="h-3.5 w-3.5" /> Export JSON
          </button>
        </div>
      </div>

      {exportErr && (
        <div className="p-3 rounded-xl border border-[#D89AA7] bg-[#FDF2F4] dark:bg-[#381C24] text-sm text-[#8C2D42] dark:text-[#F4B4C2]">
          {exportErr}
        </div>
      )}

      {/* Summary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl border border-[#E6DFD7] dark:border-[#352E38] bg-[#FFFFFF] dark:bg-[#1D191F]">
          <p className="text-xs text-[#6E5D66] dark:text-[#A598A0]">Average Cycle Length</p>
          <p className="mt-1.5 font-display text-2xl font-semibold tabular-nums">
            {data?.summary.averageCycleLength !== null
              ? `${data?.summary.averageCycleLength} days`
              : 'Insufficient logs'}
          </p>
          <p className="mt-1 text-[11px] text-[#83737C]">
            {data?.summary.completedCyclesCount
              ? `From ${data.summary.completedCyclesCount} completed cycle(s)`
              : 'Needs at least 2 logged periods'}
          </p>
        </div>

        <div className="p-5 rounded-2xl border border-[#E6DFD7] dark:border-[#352E38] bg-[#FFFFFF] dark:bg-[#1D191F]">
          <p className="text-xs text-[#6E5D66] dark:text-[#A598A0]">Average Period Duration</p>
          <p className="mt-1.5 font-display text-2xl font-semibold tabular-nums">
            {data?.summary.averagePeriodDuration !== null
              ? `${data?.summary.averagePeriodDuration} days`
              : 'Insufficient logs'}
          </p>
          <p className="mt-1 text-[11px] text-[#83737C]">
            From {data?.summary.totalLoggedPeriods || 0} logged period(s)
          </p>
        </div>

        <div className="p-5 rounded-2xl border border-[#E6DFD7] dark:border-[#352E38] bg-[#FFFFFF] dark:bg-[#1D191F]">
          <p className="text-xs text-[#6E5D66] dark:text-[#A598A0]">Cycle Variability (SD)</p>
          <p className="mt-1.5 font-display text-2xl font-semibold tabular-nums">
            {data?.summary.cycleVariabilityDays !== null
              ? `±${data?.summary.cycleVariabilityDays} days`
              : 'Insufficient logs'}
          </p>
          <p className="mt-1 text-[11px] text-[#83737C]">
            Requires 2+ completed cycle intervals
          </p>
        </div>

        <div className="p-5 rounded-2xl border border-[#E6DFD7] dark:border-[#352E38] bg-[#FFFFFF] dark:bg-[#1D191F]">
          <p className="text-xs text-[#6E5D66] dark:text-[#A598A0]">Wellness Entries Logged</p>
          <p className="mt-1.5 font-display text-2xl font-semibold tabular-nums">
            {data?.recentWellnessCount || 0}
          </p>
          <p className="mt-1 text-[11px] text-[#83737C]">Water, sleep &amp; energy records</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="rounded-2xl border border-[#E6DFD7] dark:border-[#352E38] bg-[#FFFFFF] dark:bg-[#1D191F] p-6">
          <h2 className="font-display text-xl font-semibold mb-4">Cycle Length Trend</h2>
          {cycleLengthChartData.length === 0 ? (
            <div className="py-12 text-center text-sm text-[#6E5D66] dark:text-[#A598A0]">
              <p>Log at least 2 periods to calculate and chart completed cycle lengths.</p>
              <Link
                to="/periods"
                className="mt-3 inline-block text-xs font-medium text-[#9D4E63] dark:text-[#E097AA] hover:underline"
              >
                Go to Period Tracker
              </Link>
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={cycleLengthChartData} margin={{ top: 8, right: 16, left: -12, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.25} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line
                    type="monotone"
                    dataKey="cycleLength"
                    name="Cycle Length (days)"
                    stroke="#9D4E63"
                    strokeWidth={2.5}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-[#E6DFD7] dark:border-[#352E38] bg-[#FFFFFF] dark:bg-[#1D191F] p-6">
          <h2 className="font-display text-xl font-semibold mb-4">Period Duration History</h2>
          {periodDurationChartData.length === 0 ? (
            <div className="py-12 text-center text-sm text-[#6E5D66] dark:text-[#A598A0]">
              No logged periods yet.
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={periodDurationChartData} margin={{ top: 8, right: 16, left: -12, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.25} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar
                    dataKey="durationDays"
                    name="Duration (days)"
                    fill="#5C7A67"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-[#E6DFD7] dark:border-[#352E38] bg-[#FFFFFF] dark:bg-[#1D191F] p-6">
          <h2 className="font-display text-xl font-semibold mb-4">Symptom Trends</h2>
          {!data?.symptomTrends.length ? (
            <p className="py-10 text-center text-sm text-[#6E5D66] dark:text-[#A598A0]">
              No symptom logs recorded yet.
            </p>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.symptomTrends.slice(0, 8)}
                  margin={{ top: 8, right: 16, left: -12, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.25} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                  />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" name="Occurrences" fill="#B85D74" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-[#E6DFD7] dark:border-[#352E38] bg-[#FFFFFF] dark:bg-[#1D191F] p-6">
          <h2 className="font-display text-xl font-semibold mb-4">Mood Trends</h2>
          {!data?.moodTrends.length ? (
            <p className="py-10 text-center text-sm text-[#6E5D66] dark:text-[#A598A0]">
              No mood logs recorded yet.
            </p>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.moodTrends} margin={{ top: 8, right: 16, left: -12, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.25} />
                  <XAxis dataKey="mood" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" name="Days" fill="#7E6B9B" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      </div>

      {/* Sleep & Hydration Wellness Chart */}
      <section className="rounded-2xl border border-[#E6DFD7] dark:border-[#352E38] bg-[#FFFFFF] dark:bg-[#1D191F] p-6">
        <h2 className="font-display text-xl font-semibold mb-4">
          Daily Sleep &amp; Hydration Trends
        </h2>
        {!data?.wellnessTrends?.length ? (
          <p className="py-8 text-center text-sm text-[#6E5D66] dark:text-[#A598A0]">
            Log daily wellness entries to visualize your sleep hours, hydration, and energy over time.
          </p>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.wellnessTrends} margin={{ top: 8, right: 16, left: -12, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.25} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line
                  type="monotone"
                  dataKey="sleepHours"
                  name="Sleep (hrs)"
                  stroke="#7E6B9B"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="waterLiters"
                  name="Water (L)"
                  stroke="#5C7A67"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="energyLevel"
                  name="Energy (1-5)"
                  stroke="#9D4E63"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* Symptoms by Cycle Phase + Cycle History Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-5 rounded-2xl border border-[#E6DFD7] dark:border-[#352E38] bg-[#FFFFFF] dark:bg-[#1D191F] p-6">
          <h2 className="font-display text-xl font-semibold mb-4">Symptoms by Cycle Phase</h2>
          {!data?.phaseSymptomSummary?.some((p) => p.topSymptoms.length > 0) ? (
            <p className="py-6 text-sm text-[#6E5D66] dark:text-[#A598A0]">
              Log periods and symptoms to see which symptoms tend to cluster in each phase.
            </p>
          ) : (
            <div className="divide-y divide-[#EFEAE4] dark:divide-[#2D2630] text-sm">
              {data.phaseSymptomSummary.map((item) => (
                <div key={item.phase} className="py-3 flex items-start justify-between gap-4">
                  <span className="capitalize font-medium">{item.phase} Phase</span>
                  <span className="text-xs text-[#594B53] dark:text-[#BFB2BA] text-right">
                    {item.topSymptoms.length > 0
                      ? item.topSymptoms.map((s) => `${s.name} (${s.count})`).join(', ')
                      : 'No symptoms logged'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="lg:col-span-7 rounded-2xl border border-[#E6DFD7] dark:border-[#352E38] bg-[#FFFFFF] dark:bg-[#1D191F] p-6">
          <h2 className="font-display text-xl font-semibold mb-4">Cycle History Table</h2>
          {!data?.cycleHistory.length ? (
            <p className="py-6 text-sm text-[#6E5D66] dark:text-[#A598A0]">
              No logged cycle records yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-[#EFEAE4] dark:border-[#2D2630] text-xs text-[#6E5D66] dark:text-[#A598A0]">
                    <th className="py-2 pr-3 font-medium">Cycle</th>
                    <th className="py-2 px-3 font-medium">Start</th>
                    <th className="py-2 px-3 font-medium">End</th>
                    <th className="py-2 px-3 font-medium text-right">Period</th>
                    <th className="py-2 pl-3 font-medium text-right">Cycle Length</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFEAE4] dark:divide-[#2D2630]">
                  {[...data.cycleHistory].reverse().map((row) => (
                    <tr key={row.startDate}>
                      <td className="py-2.5 pr-3 tabular-nums">#{row.cycleNumber}</td>
                      <td className="py-2.5 px-3 font-mono-num text-xs">{row.startDate}</td>
                      <td className="py-2.5 px-3 font-mono-num text-xs">{row.endDate || '—'}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums">
                        {row.periodDurationDays}d
                      </td>
                      <td className="py-2.5 pl-3 text-right tabular-nums">
                        {row.cycleLengthDays !== null ? `${row.cycleLengthDays}d` : 'In progress'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
