import {
  CloudRain,
  Coffee,
  Frown,
  Heart,
  Meh,
  Pencil,
  Smile,
  Sparkles,
  Trash2,
  Zap,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { MoodEntry, MoodType } from '../../shared/types';
import { apiFetch } from '../lib/api';

const MOOD_OPTIONS: {
  value: MoodType;
  label: string;
  color: string;
  icon: typeof Smile;
}[] = [
  { value: 'happy', label: 'Happy', color: '#5C7A67', icon: Smile },
  { value: 'calm', label: 'Calm', color: '#789683', icon: Heart },
  { value: 'energetic', label: 'Energetic', color: '#9D4E63', icon: Sparkles },
  { value: 'neutral', label: 'Neutral', color: '#8A7F85', icon: Meh },
  { value: 'anxious', label: 'Anxious', color: '#7E6B9B', icon: Zap },
  { value: 'sad', label: 'Sad', color: '#6E85A3', icon: CloudRain },
  { value: 'irritable', label: 'Irritable', color: '#B85D74', icon: Frown },
  { value: 'tired', label: 'Tired', color: '#A38B78', icon: Coffee },
];

export function MoodPage() {
  const today = new Date().toISOString().slice(0, 10);
  const [moods, setMoods] = useState<MoodEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [date, setDate] = useState(today);
  const [mood, setMood] = useState<MoodType>('calm');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadMoods = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ moods: MoodEntry[] }>('/api/moods');
      setMoods(data.moods);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMoods();
  }, [loadMoods]);

  const trendData = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of moods) {
      counts.set(m.mood, (counts.get(m.mood) || 0) + 1);
    }
    return MOOD_OPTIONS.map((opt) => ({
      mood: opt.label,
      count: counts.get(opt.value) || 0,
    })).filter((item) => item.count > 0);
  }, [moods]);

  // Build 30-day mood calendar strip
  const recent30Days = useMemo(() => {
    const map = new Map<string, MoodEntry>();
    for (const m of moods) {
      if (!map.has(m.date)) map.set(m.date, m);
    }
    const list: { date: string; entry?: MoodEntry }[] = [];
    const base = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate() - i));
      const iso = d.toISOString().slice(0, 10);
      list.push({ date: iso, entry: map.get(iso) });
    }
    return list;
  }, [moods]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);
    try {
      if (editingId) {
        await apiFetch(`/api/moods/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify({ date, mood, notes }),
        });
        setSuccess('Mood entry updated.');
      } else {
        await apiFetch('/api/moods', {
          method: 'POST',
          body: JSON.stringify({ date, mood, notes }),
        });
        setSuccess('Mood logged.');
      }
      setEditingId(null);
      setDate(today);
      setMood('calm');
      setNotes('');
      await loadMoods();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save mood');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (entry: MoodEntry) => {
    setEditingId(entry.id);
    setDate(entry.date);
    setMood(entry.mood);
    setNotes(entry.notes || '');
  };

  const handleDelete = async (id: string) => {
    await apiFetch(`/api/moods/${id}`, { method: 'DELETE' });
    if (editingId === id) setEditingId(null);
    await loadMoods();
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold">Mood Tracker</h1>
        <p className="mt-1 text-sm text-[#594B53] dark:text-[#BFB2BA]">
          Reflect on your daily emotional tone alongside your cycle. Mood logs are strictly for personal self-awareness and are never used for mental health diagnosis.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-5 rounded-2xl border border-[#E6DFD7] dark:border-[#352E38] bg-[#FFFFFF] dark:bg-[#1D191F] p-6 space-y-5"
        >
          <h2 className="font-display text-xl font-semibold">
            {editingId ? 'Edit Mood Log' : 'How Are You Feeling?'}
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

          <div className="grid grid-cols-2 gap-2.5">
            {MOOD_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const active = mood === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setMood(opt.value)}
                  className={`flex items-center gap-2.5 p-3 rounded-xl border text-sm font-medium transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#9D4E63] text-white border-[#9D4E63]'
                      : 'border-[#DFD6CE] dark:border-[#3C333F] text-[#2B2328] dark:text-[#F4EEF2] hover:bg-[#F5F0EC] dark:hover:bg-[#262129]'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>

          <div>
            <label className="block text-xs font-medium text-[#594B53] dark:text-[#BFB2BA] mb-1.5">
              Journal Note (optional)
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What contributed to your mood today?"
              className="w-full rounded-xl border border-[#DFD6CE] dark:border-[#3C333F] bg-[#FAF8F6] dark:bg-[#141115] px-3.5 py-2 text-sm"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 rounded-xl bg-[#9D4E63] hover:bg-[#843E51] text-white text-sm font-medium cursor-pointer disabled:opacity-60"
            >
              {submitting ? 'Saving...' : editingId ? 'Update Mood' : 'Save Mood'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setNotes('');
                }}
                className="px-4 py-2.5 rounded-xl border border-[#DFD6CE] dark:border-[#3C333F] text-sm cursor-pointer"
              >
                Cancel
              </button>
            )}
          </div>
        </form>

        <div className="lg:col-span-7 space-y-6">
          {/* 30-Day Mood Calendar */}
          <section className="rounded-2xl border border-[#E6DFD7] dark:border-[#352E38] bg-[#FFFFFF] dark:bg-[#1D191F] p-6">
            <h2 className="font-display text-xl font-semibold mb-3">30-Day Mood Calendar</h2>
            <div className="grid grid-cols-6 sm:grid-cols-10 gap-2">
              {recent30Days.map((d) => {
                const opt = d.entry
                  ? MOOD_OPTIONS.find((o) => o.value === d.entry!.mood)
                  : null;
                return (
                  <div
                    key={d.date}
                    title={`${d.date}: ${opt ? opt.label : 'No log'}`}
                    className="p-2 rounded-xl border border-[#EFEAE4] dark:border-[#2D2630] bg-[#FAF8F6] dark:bg-[#141115] text-center"
                  >
                    <p className="text-[10px] text-[#6E5D66] dark:text-[#A598A0] tabular-nums">
                      {d.date.slice(5)}
                    </p>
                    <p
                      className="mt-1 text-[11px] font-medium truncate"
                      style={{ color: opt?.color || undefined }}
                    >
                      {opt ? opt.label : '—'}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Trend Chart */}
          <section className="rounded-2xl border border-[#E6DFD7] dark:border-[#352E38] bg-[#FFFFFF] dark:bg-[#1D191F] p-6">
            <h2 className="font-display text-xl font-semibold mb-4">Mood Distribution</h2>
            {trendData.length === 0 ? (
              <p className="py-8 text-center text-sm text-[#6E5D66] dark:text-[#A598A0]">
                Log moods across your cycle to see trends appear here.
              </p>
            ) : (
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trendData} margin={{ top: 8, right: 16, left: -12, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.25} />
                    <XAxis dataKey="mood" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#7E6B9B" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>

          {/* Mood History */}
          <section className="rounded-2xl border border-[#E6DFD7] dark:border-[#352E38] bg-[#FFFFFF] dark:bg-[#1D191F] p-6">
            <h2 className="font-display text-xl font-semibold mb-4">Recent Mood Entries</h2>
            {loading ? (
              <div className="h-28 rounded-xl bg-[#FAF8F6] dark:bg-[#141115] animate-pulse" />
            ) : moods.length === 0 ? (
              <p className="py-6 text-center text-sm text-[#6E5D66]">No mood entries yet.</p>
            ) : (
              <div className="divide-y divide-[#EFEAE4] dark:divide-[#2D2630]">
                {moods.map((m) => (
                  <div key={m.id} className="py-3 flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 text-xs text-[#6E5D66] dark:text-[#A598A0]">
                        <span className="font-mono-num">{m.date}</span>
                        <span aria-hidden="true">·</span>
                        <span className="capitalize font-medium text-[#2B2328] dark:text-[#F4EEF2]">
                          {m.mood}
                        </span>
                      </div>
                      {m.notes && (
                        <p className="mt-1 text-xs text-[#594B53] dark:text-[#BFB2BA]">{m.notes}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleEdit(m)}
                        className="p-1.5 rounded-lg text-[#594B53] hover:text-[#9D4E63] cursor-pointer"
                        aria-label="Edit mood entry"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(m.id)}
                        className="p-1.5 rounded-lg text-[#594B53] hover:text-[#B84359] cursor-pointer"
                        aria-label="Delete mood entry"
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
    </div>
  );
}
