import {
  Activity,
  CalendarDays,
  Droplets,
  GlassWater,
  HeartHandshake,
  Leaf,
  Smile,
  Sparkles,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PHASE_NUTRITION_CONTENT } from '../../shared/nutritionData';
import type {
  CycleOverview,
  CyclePhaseId,
  MoodEntry,
  SymptomEntry,
  WellnessEntry,
} from '../../shared/types';
import { CycleRing } from '../components/CycleRing';
import { QuickLogModal, type QuickLogKind } from '../components/QuickLogModal';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';

const PHASE_BAR_COLORS: Record<CyclePhaseId, string> = {
  menstrual: 'bg-[#B85D74]',
  follicular: 'bg-[#6E917B]',
  ovulation: 'bg-[#8E78AD]',
  luteal: 'bg-[#C89B7B]',
};

export function DashboardPage() {
  const { user, cycleSettings } = useAuth();
  const [overview, setOverview] = useState<CycleOverview | null>(null);
  const [todayWellness, setTodayWellness] = useState<WellnessEntry | null>(null);
  const [recentSymptoms, setRecentSymptoms] = useState<SymptomEntry[]>([]);
  const [recentMoods, setRecentMoods] = useState<MoodEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingWater, setAddingWater] = useState(false);
  const [error, setError] = useState('');
  const [modalKind, setModalKind] = useState<QuickLogKind | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [ov, wellRes, symRes, moodRes] = await Promise.all([
        apiFetch<CycleOverview>('/api/cycle/overview'),
        apiFetch<{ wellness: WellnessEntry[] }>('/api/wellness'),
        apiFetch<{ symptoms: SymptomEntry[] }>('/api/symptoms'),
        apiFetch<{ moods: MoodEntry[] }>('/api/moods'),
      ]);
      setOverview(ov);
      const todayEntry = wellRes.wellness.find((w) => w.date === ov.currentDate) || null;
      setTodayWellness(todayEntry);
      setRecentSymptoms(symRes.symptoms.slice(0, 3));
      setRecentMoods(moodRes.moods.slice(0, 3));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleQuickAddWater = async () => {
    if (!overview || addingWater) return;
    setAddingWater(true);
    try {
      if (todayWellness) {
        const res = await apiFetch<{ wellness: WellnessEntry }>(
          `/api/wellness/${todayWellness.id}`,
          {
            method: 'PUT',
            body: JSON.stringify({
              date: todayWellness.date,
              waterIntakeMl: Math.min(10000, todayWellness.waterIntakeMl + 250),
              sleepHours: todayWellness.sleepHours,
              physicalActivityMinutes: todayWellness.physicalActivityMinutes,
              exerciseType: todayWellness.exerciseType,
              energyLevel: todayWellness.energyLevel,
              selfCareNotes: todayWellness.selfCareNotes,
            }),
          }
        );
        setTodayWellness(res.wellness);
      } else {
        const res = await apiFetch<{ wellness: WellnessEntry }>('/api/wellness', {
          method: 'POST',
          body: JSON.stringify({
            date: overview.currentDate,
            waterIntakeMl: 250,
            sleepHours: 7.5,
            physicalActivityMinutes: 0,
            exerciseType: '',
            energyLevel: 3,
            selfCareNotes: '',
          }),
        });
        setTodayWellness(res.wellness);
      }
    } finally {
      setAddingWater(false);
    }
  };

  if (loading && !overview) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-56 rounded-lg bg-[#EAE3DC] dark:bg-[#262129]" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 h-80 rounded-2xl bg-[#EAE3DC] dark:bg-[#262129]" />
          <div className="lg:col-span-7 h-80 rounded-2xl bg-[#EAE3DC] dark:bg-[#262129]" />
        </div>
      </div>
    );
  }

  const phaseContent =
    PHASE_NUTRITION_CONTENT.find((p) => p.phase === overview?.currentPhase) ||
    PHASE_NUTRITION_CONTENT[0];
  const dietPref = cycleSettings?.trackingPreferences?.dietPreference || 'all';

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-[#E6DFD7] dark:border-[#352E38] bg-gradient-to-br from-[#FDF6F8] via-[#FFFFFF] to-[#F2F7F4] dark:from-[#261B21] dark:via-[#1D191F] dark:to-[#19221D] p-6 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <p className="text-xs font-medium text-[#7A6872] dark:text-[#B5A7B0] tabular-nums">
            {overview?.currentDate || new Date().toISOString().slice(0, 10)} ·{' '}
            {user?.timezone || 'UTC'}
          </p>
          <h1 className="mt-1 font-display text-3xl sm:text-4xl font-semibold text-[#2B2328] dark:text-[#F4EEF2]">
            Good day, {user?.fullName?.split(' ')[0] || 'there'}
          </h1>
          <p className="mt-1.5 text-sm text-[#594B53] dark:text-[#BFB2BA]">
            {overview
              ? `${overview.currentPhaseName} · Theme: ${overview.currentPhaseTheme}`
              : 'Your private cycle & daily wellness sanctuary.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to="/play"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#DFD1D6] dark:border-[#493640] bg-[#FFFFFF]/85 dark:bg-[#241B20] hover:border-[#9D4E63] text-sm font-medium transition-colors whitespace-nowrap"
          >
            <Sparkles className="h-4 w-4 text-[#9D4E63] dark:text-[#E097AA]" />
            Relax & Play
          </Link>
          <Link
            to="/calendar"
            className="px-4 py-2.5 rounded-xl border border-[#DFD6CE] dark:border-[#3C333F] bg-[#FFFFFF] dark:bg-[#1D191F] hover:bg-[#F5F0EC] dark:hover:bg-[#262129] text-sm font-medium transition-colors whitespace-nowrap"
          >
            Open Calendar
          </Link>
          <button
            type="button"
            onClick={() => setModalKind('period')}
            className="px-4 py-2.5 rounded-xl bg-[#9D4E63] hover:bg-[#843E51] text-white text-sm font-medium shadow-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Log Period
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-[#D89AA7] bg-[#FDF2F4] dark:bg-[#381C24] text-sm text-[#8C2D42] dark:text-[#F4B4C2]">
          {error}
        </div>
      )}

      {overview && (
        <>
          {/* Section A & B: Cycle Overview + Current Phase */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            <section className="lg:col-span-5 rounded-3xl border border-[#E6DFD7] dark:border-[#352E38] bg-[#FFFFFF] dark:bg-[#1D191F] p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-4">
                  <h2 className="font-display text-xl font-semibold">Cycle Overview</h2>
                  <span className="text-xs text-[#6E5D66] dark:text-[#A598A0]">
                    {overview.completedCyclesCount >= 2 ? 'History-based estimate' : 'Initial estimate'}
                  </span>
                </div>
                <CycleRing overview={overview} />
              </div>

              <div className="mt-6 pt-5 border-t border-[#EFEAE4] dark:border-[#2D2630] grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-[#6E5D66] dark:text-[#A598A0]">Est. Cycle Length</p>
                  <p className="mt-0.5 font-semibold tabular-nums">
                    {overview.estimatedCycleLength} days
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#6E5D66] dark:text-[#A598A0]">Last Logged Period</p>
                  <p className="mt-0.5 font-semibold tabular-nums">
                    {overview.lastLoggedPeriod?.startDate || 'Not logged yet'}
                  </p>
                </div>
              </div>
            </section>

            <section className="lg:col-span-7 rounded-2xl border border-[#E6DFD7] dark:border-[#352E38] bg-[#FFFFFF] dark:bg-[#1D191F] p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-[#9D4E63] dark:text-[#E097AA]">
                    Estimated Current Phase · Theme: {phaseContent.theme}
                  </span>
                  <Link
                    to="/nutrition"
                    className="text-xs font-medium text-[#5C7A67] dark:text-[#96B8A2] hover:underline whitespace-nowrap"
                  >
                    Full phase guide
                  </Link>
                </div>
                <h2 className="mt-1.5 font-display text-2xl sm:text-3xl font-semibold">
                  {overview.currentPhaseName}
                </h2>
                <p className="mt-2.5 text-sm text-[#594B53] dark:text-[#C5B8C0] leading-relaxed">
                  {overview.currentPhaseDescription}
                </p>

                {/* Phase Journey Timeline Bar */}
                <div className="mt-5">
                  <div className="flex h-2.5 w-full rounded-full overflow-hidden gap-0.5 bg-[#FAF8F6] dark:bg-[#141115]">
                    {overview.phaseRanges.map((r) => {
                      const span = Math.max(1, r.endDay - r.startDay + 1);
                      const widthPct = (span / Math.max(1, overview.estimatedCycleLength)) * 100;
                      const isActive = overview.currentPhase === r.phase;
                      return (
                        <div
                          key={r.phase}
                          style={{ width: `${widthPct}%` }}
                          className={`${PHASE_BAR_COLORS[r.phase]} ${
                            isActive ? 'opacity-100' : 'opacity-35'
                          } transition-opacity`}
                          title={`${r.name}: Days ${r.startDay}–${r.endDay}`}
                        />
                      );
                    })}
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-[11px] text-[#6E5D66] dark:text-[#A598A0] tabular-nums">
                    {overview.phaseRanges.map((r) => (
                      <span
                        key={r.phase}
                        className={
                          overview.currentPhase === r.phase
                            ? 'font-semibold text-[#2B2328] dark:text-[#F4EEF2]'
                            : ''
                        }
                      >
                        {r.phase.slice(0, 3).toUpperCase()} D{r.startDay}–{r.endDay}
                      </span>
                    ))}
                  </div>
                </div>

                {overview.isIrregularPattern && (
                  <p className="mt-3 text-xs text-[#7E6B9B] dark:text-[#C5B4E0]">
                    Note: Your logged cycle lengths show natural variation ({overview.cycleVariabilityDays ?? '—'} days SD). Estimates may shift more noticeably.
                  </p>
                )}

                <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-5 pt-5 border-t border-[#EFEAE4] dark:border-[#2D2630]">
                  <div>
                    <h3 className="text-xs font-semibold text-[#2B2328] dark:text-[#F4EEF2] mb-2">
                      Nutrition Suggestions
                    </h3>
                    <ul className="space-y-1.5 text-xs text-[#594B53] dark:text-[#BFB2BA] leading-relaxed">
                      {phaseContent.foodsToEnjoy.slice(0, 3).map((item) => {
                        const sample =
                          dietPref === 'non_vegetarian'
                            ? item.nonVegetarianOptions[0]
                            : item.vegetarianOptions[0];
                        return (
                          <li key={item.category}>
                            <span className="font-medium text-[#2B2328] dark:text-[#F4EEF2]">
                              {item.category}:
                            </span>{' '}
                            {sample}
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-xs font-semibold text-[#2B2328] dark:text-[#F4EEF2] mb-2">
                      Wellness Guidance
                    </h3>
                    <ul className="space-y-1.5 text-xs text-[#594B53] dark:text-[#BFB2BA] leading-relaxed">
                      <li>· {phaseContent.hydrationTip}</li>
                      <li>· {phaseContent.exerciseSuggestions[0]}</li>
                      <li>· {phaseContent.restAndSelfCare[0]}</li>
                    </ul>
                  </div>
                </div>
              </div>

              <p className="mt-5 pt-4 border-t border-[#EFEAE4] dark:border-[#2D2630] text-[11px] text-[#7A6B74] dark:text-[#968991] leading-relaxed">
                {overview.predictionDisclaimer}
              </p>
            </section>
          </div>

          {/* Section C: Quick Actions */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-xl font-semibold">Quick Actions</h2>
              <Link
                to="/play"
                className="text-xs font-medium text-[#9D4E63] dark:text-[#E097AA] hover:underline"
              >
                Need a break? Open Relax & Play
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
              <button
                type="button"
                onClick={() => setModalKind('period')}
                className="p-4 rounded-2xl border border-[#E6DFD7] dark:border-[#352E38] bg-[#FFFFFF] dark:bg-[#1D191F] hover:border-[#9D4E63] hover:-translate-y-0.5 hover:shadow-sm text-left transition-all cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-[#F9E8EE] dark:bg-[#3A222B] flex items-center justify-center">
                  <Droplets className="h-4 w-4 text-[#9D4E63] dark:text-[#E097AA]" />
                </div>
                <p className="mt-2.5 text-sm font-medium">Log Period</p>
              </button>
              <button
                type="button"
                onClick={() => setModalKind('symptom')}
                className="p-4 rounded-2xl border border-[#E6DFD7] dark:border-[#352E38] bg-[#FFFFFF] dark:bg-[#1D191F] hover:border-[#7E6B9B] hover:-translate-y-0.5 hover:shadow-sm text-left transition-all cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-[#EFEAF8] dark:bg-[#292238] flex items-center justify-center">
                  <Activity className="h-4 w-4 text-[#7E6B9B] dark:text-[#B9A7D6]" />
                </div>
                <p className="mt-2.5 text-sm font-medium">Log Symptoms</p>
              </button>
              <button
                type="button"
                onClick={() => setModalKind('mood')}
                className="p-4 rounded-2xl border border-[#E6DFD7] dark:border-[#352E38] bg-[#FFFFFF] dark:bg-[#1D191F] hover:border-[#C89B7B] hover:-translate-y-0.5 hover:shadow-sm text-left transition-all cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-[#FAF0E4] dark:bg-[#33271D] flex items-center justify-center">
                  <Smile className="h-4 w-4 text-[#C89B7B] dark:text-[#E0B79B]" />
                </div>
                <p className="mt-2.5 text-sm font-medium">Log Mood</p>
              </button>
              <Link
                to="/calendar"
                className="p-4 rounded-2xl border border-[#E6DFD7] dark:border-[#352E38] bg-[#FFFFFF] dark:bg-[#1D191F] hover:border-[#5C7A67] hover:-translate-y-0.5 hover:shadow-sm text-left transition-all"
              >
                <div className="w-9 h-9 rounded-xl bg-[#E9F2EC] dark:bg-[#1E2E24] flex items-center justify-center">
                  <CalendarDays className="h-4 w-4 text-[#5C7A67] dark:text-[#96B8A2]" />
                </div>
                <p className="mt-2.5 text-sm font-medium">Open Calendar</p>
              </Link>
              <Link
                to="/nutrition"
                className="p-4 rounded-2xl border border-[#E6DFD7] dark:border-[#352E38] bg-[#FFFFFF] dark:bg-[#1D191F] hover:border-[#5C7A67] hover:-translate-y-0.5 hover:shadow-sm text-left transition-all"
              >
                <div className="w-9 h-9 rounded-xl bg-[#E9F2EC] dark:bg-[#1E2E24] flex items-center justify-center">
                  <Leaf className="h-4 w-4 text-[#5C7A67] dark:text-[#96B8A2]" />
                </div>
                <p className="mt-2.5 text-sm font-medium">View Nutrition</p>
              </Link>
              <button
                type="button"
                onClick={() => setModalKind('wellness')}
                className="p-4 rounded-2xl border border-[#E6DFD7] dark:border-[#352E38] bg-[#FFFFFF] dark:bg-[#1D191F] hover:border-[#9D4E63] hover:-translate-y-0.5 hover:shadow-sm text-left transition-all cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-[#F9E8EE] dark:bg-[#3A222B] flex items-center justify-center">
                  <HeartHandshake className="h-4 w-4 text-[#9D4E63] dark:text-[#E097AA]" />
                </div>
                <p className="mt-2.5 text-sm font-medium">Record Wellness</p>
              </button>
              <Link
                to="/play"
                className="p-4 rounded-2xl border border-[#E6DFD7] dark:border-[#352E38] bg-gradient-to-br from-[#FDF6F8] to-[#F3F7F4] dark:from-[#261B21] dark:to-[#1B241E] hover:border-[#9D4E63] hover:-translate-y-0.5 hover:shadow-sm text-left transition-all"
              >
                <div className="w-9 h-9 rounded-xl bg-[#FFFFFF] dark:bg-[#1D191F] border border-[#E6DFD7] dark:border-[#352E38] flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-[#9D4E63] dark:text-[#E097AA]" />
                </div>
                <p className="mt-2.5 text-sm font-medium">Relax & Play</p>
              </Link>
            </div>
          </section>

          {/* Section D & E: Daily Wellness & Upcoming Estimates */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <section className="lg:col-span-6 rounded-3xl border border-[#E6DFD7] dark:border-[#352E38] bg-[#FFFFFF] dark:bg-[#1D191F] p-6 shadow-xs">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="font-display text-xl font-semibold">Today&apos;s Daily Wellness</h2>
                  <p className="text-xs text-[#6E5D66] dark:text-[#A598A0]">
                    {todayWellness
                      ? `Recorded for ${todayWellness.date}`
                      : 'No wellness record for today yet'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={addingWater}
                    onClick={handleQuickAddWater}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#C9D8CD] dark:border-[#395343] bg-[#F2F7F4] dark:bg-[#1D2A22] text-xs font-medium text-[#365341] dark:text-[#A9D1B8] hover:opacity-90 cursor-pointer disabled:opacity-60"
                  >
                    <GlassWater className="h-3.5 w-3.5" /> +250 ml
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalKind('wellness')}
                    className="text-xs font-medium text-[#9D4E63] dark:text-[#E097AA] hover:underline cursor-pointer"
                  >
                    {todayWellness ? 'Log more' : 'Record'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 pt-2">
                <div className="p-3.5 rounded-2xl bg-[#FAF8F6] dark:bg-[#141115] border border-[#EFEAE4] dark:border-[#2D2630]">
                  <p className="text-xs text-[#6E5D66] dark:text-[#A598A0]">Water</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums">
                    {todayWellness ? `${todayWellness.waterIntakeMl} ml` : '0 ml'}
                  </p>
                  <div className="mt-2 h-1.5 w-full rounded-full bg-[#EAE2DB] dark:bg-[#2B242F] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#5C7A67] transition-all"
                      style={{
                        width: `${Math.min(100, ((todayWellness?.waterIntakeMl || 0) / 2000) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#FAF8F6] dark:bg-[#141115] border border-[#EFEAE4] dark:border-[#2D2630]">
                  <p className="text-xs text-[#6E5D66] dark:text-[#A598A0]">Sleep</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums">
                    {todayWellness ? `${todayWellness.sleepHours} hrs` : '—'}
                  </p>
                  <div className="mt-2 h-1.5 w-full rounded-full bg-[#EAE2DB] dark:bg-[#2B242F] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#8E78AD] transition-all"
                      style={{
                        width: `${Math.min(100, ((todayWellness?.sleepHours || 0) / 8) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#FAF8F6] dark:bg-[#141115] border border-[#EFEAE4] dark:border-[#2D2630]">
                  <p className="text-xs text-[#6E5D66] dark:text-[#A598A0]">Exercise</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums">
                    {todayWellness ? `${todayWellness.physicalActivityMinutes} min` : '0 min'}
                  </p>
                  <div className="mt-2 h-1.5 w-full rounded-full bg-[#EAE2DB] dark:bg-[#2B242F] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#B85D74] transition-all"
                      style={{
                        width: `${Math.min(100, ((todayWellness?.physicalActivityMinutes || 0) / 30) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#FAF8F6] dark:bg-[#141115] border border-[#EFEAE4] dark:border-[#2D2630]">
                  <p className="text-xs text-[#6E5D66] dark:text-[#A598A0]">Energy</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums">
                    {todayWellness ? `${todayWellness.energyLevel}/5` : '—'}
                  </p>
                  <div className="mt-2 h-1.5 w-full rounded-full bg-[#EAE2DB] dark:bg-[#2B242F] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#C89B7B] transition-all"
                      style={{
                        width: `${Math.min(100, ((todayWellness?.energyLevel || 0) / 5) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className="lg:col-span-6 rounded-2xl border border-[#E6DFD7] dark:border-[#352E38] bg-[#FFFFFF] dark:bg-[#1D191F] p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-display text-xl font-semibold">Upcoming Estimates</h2>
                  <p className="text-xs text-[#6E5D66] dark:text-[#A598A0]">
                    Statistical projections — not for contraception
                  </p>
                </div>
                <Link
                  to="/calendar"
                  className="text-xs font-medium text-[#9D4E63] dark:text-[#E097AA] hover:underline"
                >
                  Export .ics
                </Link>
              </div>

              <div className="divide-y divide-[#EFEAE4] dark:divide-[#2D2630] text-sm">
                <div className="py-3 flex items-center justify-between gap-4">
                  <span className="text-[#594B53] dark:text-[#BFB2BA]">Estimated Next Period</span>
                  <span className="font-semibold tabular-nums">
                    {overview.estimatedNextPeriodStart
                      ? `${overview.estimatedNextPeriodStart} to ${overview.estimatedNextPeriodEnd}`
                      : 'Log a period to estimate'}
                  </span>
                </div>
                <div className="py-3 flex items-center justify-between gap-4">
                  <span className="text-[#594B53] dark:text-[#BFB2BA]">
                    Estimated Fertile Window
                  </span>
                  <span className="font-semibold tabular-nums">
                    {overview.estimatedFertileWindowStart
                      ? `${overview.estimatedFertileWindowStart} to ${overview.estimatedFertileWindowEnd}`
                      : '—'}
                  </span>
                </div>
                <div className="py-3 flex items-center justify-between gap-4">
                  <span className="text-[#594B53] dark:text-[#BFB2BA]">
                    Estimated Ovulation Date
                  </span>
                  <span className="font-semibold tabular-nums">
                    {overview.estimatedOvulationDate || '—'}
                  </span>
                </div>
              </div>
            </section>
          </div>

          {/* Section F: Recent Reflections (Symptoms & Moods) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <section className="rounded-2xl border border-[#E6DFD7] dark:border-[#352E38] bg-[#FFFFFF] dark:bg-[#1D191F] p-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-display text-lg font-semibold">Recent Symptoms</h2>
                <Link
                  to="/symptoms"
                  className="text-xs font-medium text-[#9D4E63] dark:text-[#E097AA] hover:underline"
                >
                  View all
                </Link>
              </div>
              {recentSymptoms.length === 0 ? (
                <p className="text-xs text-[#6E5D66] dark:text-[#A598A0] py-3">
                  No symptom entries logged yet.
                </p>
              ) : (
                <ul className="divide-y divide-[#EFEAE4] dark:divide-[#2D2630] text-xs">
                  {recentSymptoms.map((s) => (
                    <li key={s.id} className="py-2.5 flex items-center justify-between gap-4">
                      <span className="truncate font-medium">
                        {[...s.physicalSymptoms, ...s.emotionalSymptoms, s.otherSymptomText]
                          .filter(Boolean)
                          .join(', ')}
                      </span>
                      <span className="text-[#6E5D66] dark:text-[#A598A0] tabular-nums shrink-0">
                        {s.date} · {s.severity}/5
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-2xl border border-[#E6DFD7] dark:border-[#352E38] bg-[#FFFFFF] dark:bg-[#1D191F] p-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-display text-lg font-semibold">Recent Moods</h2>
                <Link
                  to="/mood"
                  className="text-xs font-medium text-[#9D4E63] dark:text-[#E097AA] hover:underline"
                >
                  View all
                </Link>
              </div>
              {recentMoods.length === 0 ? (
                <p className="text-xs text-[#6E5D66] dark:text-[#A598A0] py-3">
                  No mood entries logged yet.
                </p>
              ) : (
                <ul className="divide-y divide-[#EFEAE4] dark:divide-[#2D2630] text-xs">
                  {recentMoods.map((m) => (
                    <li key={m.id} className="py-2.5 flex items-center justify-between gap-4">
                      <span className="capitalize font-medium">{m.mood}</span>
                      <span className="text-[#6E5D66] dark:text-[#A598A0] tabular-nums shrink-0">
                        {m.date}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      )}

      {modalKind && (
        <QuickLogModal
          kind={modalKind}
          initialDate={overview?.currentDate}
          onClose={() => setModalKind(null)}
          onSaved={loadDashboard}
        />
      )}
    </div>
  );
}
