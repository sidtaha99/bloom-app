import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import type { CycleRegularity, CycleSettingsDTO, UserProfile } from '../../shared/types';
import { BloomLogo } from '../components/BloomLogo';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';

export function OnboardingPage() {
  const navigate = useNavigate();
  const { user, setSessionData } = useAuth();
  const [lastPeriodStartDate, setLastPeriodStartDate] = useState('');
  const [averageCycleLength, setAverageCycleLength] = useState(29);
  const [averagePeriodDuration, setAveragePeriodDuration] = useState(5);
  const [cycleRegularity, setCycleRegularity] = useState<CycleRegularity>('regular');
  const [trackSymptoms, setTrackSymptoms] = useState(true);
  const [trackMood, setTrackMood] = useState(true);
  const [trackWellness, setTrackWellness] = useState(true);
  const [dietPreference, setDietPreference] = useState<'all' | 'vegetarian' | 'non_vegetarian'>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submitOnboarding = async (skip: boolean) => {
    setError('');
    setLoading(true);
    try {
      const data = await apiFetch<{ user: UserProfile; cycleSettings: CycleSettingsDTO }>(
        '/api/auth/onboarding',
        {
          method: 'POST',
          body: JSON.stringify({
            skip,
            lastPeriodStartDate: skip || !lastPeriodStartDate ? null : lastPeriodStartDate,
            averageCycleLength,
            averagePeriodDuration,
            cycleRegularity,
            logInitialPeriod: !skip && Boolean(lastPeriodStartDate),
            trackingPreferences: {
              trackSymptoms,
              trackMood,
              trackWellness,
              dietPreference,
            },
          }),
        }
      );
      setSessionData(data.user, data.cycleSettings);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save preferences');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    submitOnboarding(false);
  };

  return (
    <div className="min-h-screen bg-[#FAF8F6] dark:bg-[#141115] text-[#2B2328] dark:text-[#F4EEF2] py-10 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto">
        <div className="text-center">
          <BloomLogo size={32} />
          <h1 className="mt-4 font-display text-3xl font-semibold">
            Welcome to Bloom{user?.fullName ? `, ${user.fullName.split(' ')[0]}` : ''}
          </h1>
          <p className="mt-2 text-sm text-[#594B53] dark:text-[#BFB2BA]">
            Share a few optional starting details so Bloom can tailor your initial cycle estimates. You can change or skip any item and update settings anytime.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-8 rounded-2xl border border-[#E6DFD7] dark:border-[#352E38] bg-[#FFFFFF] dark:bg-[#1D191F] p-6 sm:p-8 space-y-6"
        >
          {error && (
            <div className="p-3 rounded-xl border border-[#D89AA7] bg-[#FDF2F4] dark:bg-[#381C24] text-sm text-[#8C2D42] dark:text-[#F4B4C2]">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1.5">
              When did your last period start? <span className="text-xs text-[#6E5D66]">(optional)</span>
            </label>
            <input
              type="date"
              value={lastPeriodStartDate}
              onChange={(e) => setLastPeriodStartDate(e.target.value)}
              className="w-full rounded-xl border border-[#DFD6CE] dark:border-[#3C333F] bg-[#FAF8F6] dark:bg-[#141115] px-3.5 py-2.5 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Typical Cycle Length (days)
              </label>
              <input
                type="number"
                min={18}
                max={60}
                value={averageCycleLength}
                onChange={(e) => setAverageCycleLength(Number(e.target.value))}
                className="w-full rounded-xl border border-[#DFD6CE] dark:border-[#3C333F] bg-[#FAF8F6] dark:bg-[#141115] px-3.5 py-2.5 text-sm tabular-nums"
              />
              <p className="mt-1 text-xs text-[#6E5D66] dark:text-[#A598A0]">
                Initial estimate only — updates automatically as you log periods.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Typical Period Duration (days)
              </label>
              <input
                type="number"
                min={1}
                max={14}
                value={averagePeriodDuration}
                onChange={(e) => setAveragePeriodDuration(Number(e.target.value))}
                className="w-full rounded-xl border border-[#DFD6CE] dark:border-[#3C333F] bg-[#FAF8F6] dark:bg-[#141115] px-3.5 py-2.5 text-sm tabular-nums"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Cycle Regularity</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(
                [
                  { v: 'regular', l: 'Regular' },
                  { v: 'somewhat_irregular', l: 'Somewhat varied' },
                  { v: 'irregular', l: 'Irregular' },
                  { v: 'unsure', l: 'Not sure yet' },
                ] as { v: CycleRegularity; l: string }[]
              ).map((opt) => (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => setCycleRegularity(opt.v)}
                  className={`py-2 px-3 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                    cycleRegularity === opt.v
                      ? 'bg-[#9D4E63] text-white border-[#9D4E63]'
                      : 'border-[#DFD6CE] dark:border-[#3C333F] text-[#594B53] dark:text-[#BFB2BA]'
                  }`}
                >
                  {opt.l}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Optional Tracking & Nutrition Preferences
            </label>
            <div className="space-y-2.5 text-sm">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={trackSymptoms}
                  onChange={(e) => setTrackSymptoms(e.target.checked)}
                  className="accent-[#9D4E63]"
                />
                Include physical and emotional symptom tracking
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={trackMood}
                  onChange={(e) => setTrackMood(e.target.checked)}
                  className="accent-[#9D4E63]"
                />
                Include daily mood journaling
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={trackWellness}
                  onChange={(e) => setTrackWellness(e.target.checked)}
                  className="accent-[#9D4E63]"
                />
                Include daily water, sleep, and activity tracking
              </label>
            </div>

            <div className="mt-4">
              <span className="block text-xs font-medium text-[#594B53] dark:text-[#BFB2BA] mb-1.5">
                Nutrition Suggestion Preference
              </span>
              <div className="inline-flex gap-1.5 p-1 rounded-xl border border-[#DFD6CE] dark:border-[#3C333F] bg-[#FAF8F6] dark:bg-[#141115]">
                {(
                  [
                    { v: 'all', l: 'All Options' },
                    { v: 'vegetarian', l: 'Vegetarian' },
                    { v: 'non_vegetarian', l: 'Non-Vegetarian' },
                  ] as const
                ).map((d) => (
                  <button
                    key={d.v}
                    type="button"
                    onClick={() => setDietPreference(d.v)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
                      dietPreference === d.v
                        ? 'bg-[#9D4E63] text-white'
                        : 'text-[#594B53] dark:text-[#BFB2BA]'
                    }`}
                  >
                    {d.l}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              type="button"
              disabled={loading}
              onClick={() => submitOnboarding(true)}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-[#DFD6CE] dark:border-[#3C333F] text-sm font-medium text-[#594B53] dark:text-[#BFB2BA] hover:bg-[#F5F0EC] dark:hover:bg-[#262129] cursor-pointer"
            >
              Skip for now (use default estimates)
            </button>
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#9D4E63] hover:bg-[#843E51] text-white text-sm font-medium cursor-pointer disabled:opacity-60"
            >
              {loading ? 'Saving...' : 'Continue to Dashboard'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
