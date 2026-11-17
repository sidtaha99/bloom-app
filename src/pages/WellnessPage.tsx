import { Pencil, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import type { WellnessEntry } from '../../shared/types';
import { apiFetch } from '../lib/api';

const WATER_GOAL_ML = 2000;
const SLEEP_GOAL_HRS = 8;
const ACTIVITY_GOAL_MIN = 30;

export function WellnessPage() {
  const today = new Date().toISOString().slice(0, 10);
  const [entries, setEntries] = useState<WellnessEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [date, setDate] = useState(today);
  const [waterIntakeMl, setWaterIntakeMl] = useState(1500);
  const [sleepHours, setSleepHours] = useState(7.5);
  const [physicalActivityMinutes, setPhysicalActivityMinutes] = useState(30);
  const [exerciseType, setExerciseType] = useState('Walking');
  const [energyLevel, setEnergyLevel] = useState(3);
  const [selfCareNotes, setSelfCareNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadWellness = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ wellness: WellnessEntry[] }>('/api/wellness');
      setEntries(data.wellness);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWellness();
  }, [loadWellness]);

  const latestToday = entries.find((e) => e.date === today) || entries[0] || null;

  const resetForm = () => {
    setEditingId(null);
    setDate(today);
    setWaterIntakeMl(1500);
    setSleepHours(7.5);
    setPhysicalActivityMinutes(30);
    setExerciseType('Walking');
    setEnergyLevel(3);
    setSelfCareNotes('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);
    try {
      const payload = {
        date,
        waterIntakeMl,
        sleepHours,
        physicalActivityMinutes,
        exerciseType,
        energyLevel,
        selfCareNotes,
      };
      if (editingId) {
        await apiFetch(`/api/wellness/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        setSuccess('Wellness record updated.');
      } else {
        await apiFetch('/api/wellness', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setSuccess('Wellness record saved.');
      }
      resetForm();
      await loadWellness();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save wellness entry');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (item: WellnessEntry) => {
    setEditingId(item.id);
    setDate(item.date);
    setWaterIntakeMl(item.waterIntakeMl);
    setSleepHours(item.sleepHours);
    setPhysicalActivityMinutes(item.physicalActivityMinutes);
    setExerciseType(item.exerciseType || '');
    setEnergyLevel(item.energyLevel);
    setSelfCareNotes(item.selfCareNotes || '');
  };

  const handleDelete = async (id: string) => {
    await apiFetch(`/api/wellness/${id}`, { method: 'DELETE' });
    if (editingId === id) resetForm();
    await loadWellness();
  };

  const waterPct = Math.min(
    100,
    Math.round(((latestToday?.waterIntakeMl || 0) / WATER_GOAL_ML) * 100)
  );
  const sleepPct = Math.min(
    100,
    Math.round(((latestToday?.sleepHours || 0) / SLEEP_GOAL_HRS) * 100)
  );
  const activityPct = Math.min(
    100,
    Math.round(((latestToday?.physicalActivityMinutes || 0) / ACTIVITY_GOAL_MIN) * 100)
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold">Daily Wellness Tracker</h1>
        <p className="mt-1 text-sm text-[#594B53] dark:text-[#BFB2BA]">
          Track daily hydration, sleep duration, movement, energy level, and personal self-care notes.
        </p>
      </div>

      {/* Progress Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl border border-[#E6DFD7] dark:border-[#352E38] bg-[#FFFFFF] dark:bg-[#1D191F]">
          <div className="flex items-center justify-between text-xs text-[#6E5D66] dark:text-[#A598A0]">
            <span>Hydration Progress</span>
            <span className="tabular-nums">
              {latestToday?.waterIntakeMl || 0} / {WATER_GOAL_ML} ml
            </span>
          </div>
          <div className="mt-3 h-2 rounded-full bg-[#EFEAE4] dark:bg-[#2C2630] overflow-hidden">
            <div className="h-full bg-[#5C7A67] rounded-full" style={{ width: `${waterPct}%` }} />
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-[#E6DFD7] dark:border-[#352E38] bg-[#FFFFFF] dark:bg-[#1D191F]">
          <div className="flex items-center justify-between text-xs text-[#6E5D66] dark:text-[#A598A0]">
            <span>Sleep Restfulness</span>
            <span className="tabular-nums">
              {latestToday?.sleepHours || 0} / {SLEEP_GOAL_HRS} hrs
            </span>
          </div>
          <div className="mt-3 h-2 rounded-full bg-[#EFEAE4] dark:bg-[#2C2630] overflow-hidden">
            <div className="h-full bg-[#7E6B9B] rounded-full" style={{ width: `${sleepPct}%` }} />
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-[#E6DFD7] dark:border-[#352E38] bg-[#FFFFFF] dark:bg-[#1D191F]">
          <div className="flex items-center justify-between text-xs text-[#6E5D66] dark:text-[#A598A0]">
            <span>Movement Goal</span>
            <span className="tabular-nums">
              {latestToday?.physicalActivityMinutes || 0} / {ACTIVITY_GOAL_MIN} min
            </span>
          </div>
          <div className="mt-3 h-2 rounded-full bg-[#EFEAE4] dark:bg-[#2C2630] overflow-hidden">
            <div className="h-full bg-[#9D4E63] rounded-full" style={{ width: `${activityPct}%` }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-5 rounded-2xl border border-[#E6DFD7] dark:border-[#352E38] bg-[#FFFFFF] dark:bg-[#1D191F] p-6 space-y-4"
        >
          <h2 className="font-display text-xl font-semibold">
            {editingId ? 'Edit Wellness Record' : 'Log Daily Wellness'}
          </h2>

          {error && (
            <div className="p-3 rounded-xl border border-[#D89AA7] bg-[#FDF2F4] dark:bg-[#381C24] text-sm text-[#8C2D42] dark:text-[#F4B4C2]">
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 rounded-xl border border-[#C9D8CD] bg-[#F2F7F4] dark:bg-[#1D2A22] text-sm text-[#365341] dark:text-[#A9D1B8]">
              {success}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-[#594B53] dark:text-[#BFB2BA] mb-1.5">
              Date
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl border border-[#DFD6CE] dark:border-[#3C333F] bg-[#FAF8F6] dark:bg-[#141115] px-3.5 py-2.5 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#594B53] dark:text-[#BFB2BA] mb-1.5">
                Water Intake (ml)
              </label>
              <input
                type="number"
                min={0}
                max={10000}
                step={50}
                value={waterIntakeMl}
                onChange={(e) => setWaterIntakeMl(Number(e.target.value))}
                className="w-full rounded-xl border border-[#DFD6CE] dark:border-[#3C333F] bg-[#FAF8F6] dark:bg-[#141115] px-3.5 py-2 text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#594B53] dark:text-[#BFB2BA] mb-1.5">
                Sleep Duration (hrs)
              </label>
              <input
                type="number"
                min={0}
                max={24}
                step={0.5}
                value={sleepHours}
                onChange={(e) => setSleepHours(Number(e.target.value))}
                className="w-full rounded-xl border border-[#DFD6CE] dark:border-[#3C333F] bg-[#FAF8F6] dark:bg-[#141115] px-3.5 py-2 text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#594B53] dark:text-[#BFB2BA] mb-1.5">
                Activity (minutes)
              </label>
              <input
                type="number"
                min={0}
                max={720}
                value={physicalActivityMinutes}
                onChange={(e) => setPhysicalActivityMinutes(Number(e.target.value))}
                className="w-full rounded-xl border border-[#DFD6CE] dark:border-[#3C333F] bg-[#FAF8F6] dark:bg-[#141115] px-3.5 py-2 text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#594B53] dark:text-[#BFB2BA] mb-1.5">
                Exercise Type
              </label>
              <input
                type="text"
                value={exerciseType}
                onChange={(e) => setExerciseType(e.target.value)}
                placeholder="Yoga, Walking, Pilates"
                className="w-full rounded-xl border border-[#DFD6CE] dark:border-[#3C333F] bg-[#FAF8F6] dark:bg-[#141115] px-3.5 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#594B53] dark:text-[#BFB2BA] mb-1.5">
              Energy Level ({energyLevel}/5)
            </label>
            <input
              type="range"
              min={1}
              max={5}
              value={energyLevel}
              onChange={(e) => setEnergyLevel(Number(e.target.value))}
              className="w-full accent-[#5C7A67]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#594B53] dark:text-[#BFB2BA] mb-1.5">
              Self-Care Notes
            </label>
            <textarea
              rows={2}
              value={selfCareNotes}
              onChange={(e) => setSelfCareNotes(e.target.value)}
              placeholder="Gentle stretching, warm bath, early bedtime..."
              className="w-full rounded-xl border border-[#DFD6CE] dark:border-[#3C333F] bg-[#FAF8F6] dark:bg-[#141115] px-3.5 py-2 text-sm"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 rounded-xl bg-[#9D4E63] hover:bg-[#843E51] text-white text-sm font-medium cursor-pointer disabled:opacity-60"
            >
              {submitting ? 'Saving...' : editingId ? 'Update Record' : 'Save Record'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2.5 rounded-xl border border-[#DFD6CE] dark:border-[#3C333F] text-sm cursor-pointer"
              >
                Cancel
              </button>
            )}
          </div>
        </form>

        <section className="lg:col-span-7 rounded-2xl border border-[#E6DFD7] dark:border-[#352E38] bg-[#FFFFFF] dark:bg-[#1D191F] p-6">
          <h2 className="font-display text-xl font-semibold mb-4">Wellness History</h2>
          {loading ? (
            <div className="h-40 rounded-xl bg-[#FAF8F6] dark:bg-[#141115] animate-pulse" />
          ) : entries.length === 0 ? (
            <p className="py-10 text-center text-sm text-[#6E5D66] dark:text-[#A598A0]">
              No wellness records yet. Log your water, sleep, and movement on the left.
            </p>
          ) : (
            <div className="divide-y divide-[#EFEAE4] dark:divide-[#2D2630]">
              {entries.map((item) => (
                <div key={item.id} className="py-3.5 flex items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#6E5D66] dark:text-[#A598A0] tabular-nums">
                      <span className="font-mono-num font-medium text-[#2B2328] dark:text-[#F4EEF2]">
                        {item.date}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>Energy {item.energyLevel}/5</span>
                      {item.exerciseType && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{item.exerciseType}</span>
                        </>
                      )}
                    </div>
                    <p className="mt-1 text-sm tabular-nums">
                      {item.waterIntakeMl} ml water · {item.sleepHours} hrs sleep ·{' '}
                      {item.physicalActivityMinutes} min activity
                    </p>
                    {item.selfCareNotes && (
                      <p className="mt-1 text-xs text-[#594B53] dark:text-[#BFB2BA]">
                        {item.selfCareNotes}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleEdit(item)}
                      className="p-1.5 rounded-lg text-[#594B53] hover:text-[#9D4E63] cursor-pointer"
                      aria-label="Edit wellness entry"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      className="p-1.5 rounded-lg text-[#594B53] hover:text-[#B84359] cursor-pointer"
                      aria-label="Delete wellness entry"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
