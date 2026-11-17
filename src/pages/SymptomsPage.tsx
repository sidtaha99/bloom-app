import { Pencil, Trash2 } from 'lucide-react';
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
import type {
  EmotionalSymptomType,
  PhysicalSymptomType,
  SymptomEntry,
} from '../../shared/types';
import { apiFetch } from '../lib/api';

const PHYSICAL_SYMPTOMS: PhysicalSymptomType[] = [
  'Cramps',
  'Headache',
  'Bloating',
  'Acne',
  'Fatigue',
  'Back pain',
  'Breast tenderness',
  'Nausea',
  'Other',
];

const EMOTIONAL_SYMPTOMS: EmotionalSymptomType[] = [
  'Irritability',
  'Stress',
  'Anxiety',
  'Low mood',
  'Emotional sensitivity',
  'Other feelings',
];

export function SymptomsPage() {
  const today = new Date().toISOString().slice(0, 10);
  const [symptoms, setSymptoms] = useState<SymptomEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [date, setDate] = useState(today);
  const [physical, setPhysical] = useState<string[]>([]);
  const [emotional, setEmotional] = useState<string[]>([]);
  const [otherSymptomText, setOtherSymptomText] = useState('');
  const [severity, setSeverity] = useState(2);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadSymptoms = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ symptoms: SymptomEntry[] }>('/api/symptoms');
      setSymptoms(data.symptoms);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSymptoms();
  }, [loadSymptoms]);

  const frequencyData = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of symptoms) {
      for (const name of [...s.physicalSymptoms, ...s.emotionalSymptoms]) {
        counts.set(name, (counts.get(name) || 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [symptoms]);

  const toggleItem = (list: string[], setter: (v: string[]) => void, item: string) => {
    setter(list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);
  };

  const resetForm = () => {
    setEditingId(null);
    setDate(today);
    setPhysical([]);
    setEmotional([]);
    setOtherSymptomText('');
    setSeverity(2);
    setNotes('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);
    try {
      const payload = {
        date,
        physicalSymptoms: physical,
        emotionalSymptoms: emotional,
        otherSymptomText,
        severity,
        notes,
      };
      if (editingId) {
        await apiFetch(`/api/symptoms/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        setSuccess('Symptom entry updated.');
      } else {
        await apiFetch('/api/symptoms', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setSuccess('Symptom entry saved.');
      }
      resetForm();
      await loadSymptoms();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save symptom entry');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (entry: SymptomEntry) => {
    setEditingId(entry.id);
    setDate(entry.date);
    setPhysical(entry.physicalSymptoms);
    setEmotional(entry.emotionalSymptoms);
    setOtherSymptomText(entry.otherSymptomText || '');
    setSeverity(entry.severity);
    setNotes(entry.notes || '');
    setError('');
    setSuccess('');
  };

  const handleDelete = async (id: string) => {
    await apiFetch(`/api/symptoms/${id}`, { method: 'DELETE' });
    if (editingId === id) resetForm();
    await loadSymptoms();
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold">Symptom Tracker</h1>
        <p className="mt-1 text-sm text-[#594B53] dark:text-[#BFB2BA]">
          Record physical and emotional symptoms with severity levels to notice recurring patterns across your cycle.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-5 rounded-2xl border border-[#E6DFD7] dark:border-[#352E38] bg-[#FFFFFF] dark:bg-[#1D191F] p-6 space-y-5"
        >
          <h2 className="font-display text-xl font-semibold">
            {editingId ? 'Edit Symptom Entry' : 'Record Symptoms'}
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

          <div>
            <p className="text-xs font-medium text-[#594B53] dark:text-[#BFB2BA] mb-2">
              Physical Symptoms
            </p>
            <div className="flex flex-wrap gap-2">
              {PHYSICAL_SYMPTOMS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => toggleItem(physical, setPhysical, item)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                    physical.includes(item)
                      ? 'bg-[#9D4E63] text-white border-[#9D4E63]'
                      : 'border-[#DFD6CE] dark:border-[#3C333F] text-[#594B53] dark:text-[#BFB2BA]'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-[#594B53] dark:text-[#BFB2BA] mb-2">
              Emotional Symptoms
            </p>
            <div className="flex flex-wrap gap-2">
              {EMOTIONAL_SYMPTOMS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => toggleItem(emotional, setEmotional, item)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                    emotional.includes(item)
                      ? 'bg-[#7E6B9B] text-white border-[#7E6B9B]'
                      : 'border-[#DFD6CE] dark:border-[#3C333F] text-[#594B53] dark:text-[#BFB2BA]'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#594B53] dark:text-[#BFB2BA] mb-1.5">
              Other Symptom Details (optional)
            </label>
            <input
              type="text"
              value={otherSymptomText}
              onChange={(e) => setOtherSymptomText(e.target.value)}
              placeholder="Specify if needed"
              className="w-full rounded-xl border border-[#DFD6CE] dark:border-[#3C333F] bg-[#FAF8F6] dark:bg-[#141115] px-3.5 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#594B53] dark:text-[#BFB2BA] mb-1.5">
              Overall Severity ({severity}/5)
            </label>
            <input
              type="range"
              min={1}
              max={5}
              value={severity}
              onChange={(e) => setSeverity(Number(e.target.value))}
              className="w-full accent-[#9D4E63]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#594B53] dark:text-[#BFB2BA] mb-1.5">
              Notes (optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl border border-[#DFD6CE] dark:border-[#3C333F] bg-[#FAF8F6] dark:bg-[#141115] px-3.5 py-2 text-sm"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 rounded-xl bg-[#9D4E63] hover:bg-[#843E51] text-white text-sm font-medium cursor-pointer disabled:opacity-60"
            >
              {submitting ? 'Saving...' : editingId ? 'Update Entry' : 'Save Entry'}
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

        {/* Chart & History */}
        <div className="lg:col-span-7 space-y-6">
          <section className="rounded-2xl border border-[#E6DFD7] dark:border-[#352E38] bg-[#FFFFFF] dark:bg-[#1D191F] p-6">
            <h2 className="font-display text-xl font-semibold mb-4">Symptom Frequency</h2>
            {frequencyData.length === 0 ? (
              <p className="py-10 text-center text-sm text-[#6E5D66] dark:text-[#A598A0]">
                Log symptoms to view your most frequently recorded physical and emotional patterns.
              </p>
            ) : (
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={frequencyData} margin={{ top: 8, right: 16, left: -12, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.25} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-18} textAnchor="end" />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--tooltip-bg, #FFFFFF)',
                        borderColor: '#E6DFD7',
                        borderRadius: '12px',
                        fontSize: '12px',
                        color: '#2B2328',
                      }}
                    />
                    <Bar dataKey="count" fill="#9D4E63" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-[#E6DFD7] dark:border-[#352E38] bg-[#FFFFFF] dark:bg-[#1D191F] p-6">
            <h2 className="font-display text-xl font-semibold mb-4">Symptom History</h2>
            {loading ? (
              <div className="h-32 rounded-xl bg-[#FAF8F6] dark:bg-[#141115] animate-pulse" />
            ) : symptoms.length === 0 ? (
              <p className="py-8 text-center text-sm text-[#6E5D66] dark:text-[#A598A0]">
                No symptom entries yet.
              </p>
            ) : (
              <div className="divide-y divide-[#EFEAE4] dark:divide-[#2D2630]">
                {symptoms.map((entry) => (
                  <div key={entry.id} className="py-3.5 flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 text-xs text-[#6E5D66] dark:text-[#A598A0] tabular-nums">
                        <span className="font-mono-num">{entry.date}</span>
                        <span aria-hidden="true">·</span>
                        <span>Severity {entry.severity}/5</span>
                      </div>
                      <p className="mt-1 text-sm font-medium">
                        {[...entry.physicalSymptoms, ...entry.emotionalSymptoms, entry.otherSymptomText]
                          .filter(Boolean)
                          .join(', ')}
                      </p>
                      {entry.notes && (
                        <p className="mt-1 text-xs text-[#594B53] dark:text-[#BFB2BA]">
                          {entry.notes}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleEdit(entry)}
                        className="p-1.5 rounded-lg text-[#594B53] hover:text-[#9D4E63] cursor-pointer"
                        aria-label="Edit symptom entry"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(entry.id)}
                        className="p-1.5 rounded-lg text-[#594B53] hover:text-[#B84359] cursor-pointer"
                        aria-label="Delete symptom entry"
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
