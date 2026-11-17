import { Pencil, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { diffDaysISO } from '../../shared/cycleEngine';
import type { FlowIntensity, PeriodRecord } from '../../shared/types';
import { apiFetch } from '../lib/api';

export function PeriodTrackerPage() {
  const [periods, setPeriods] = useState<PeriodRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [flowIntensity, setFlowIntensity] = useState<FlowIntensity>('medium');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadPeriods = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ periods: PeriodRecord[] }>('/api/periods');
      setPeriods(data.periods);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load periods');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPeriods();
  }, [loadPeriods]);

  const resetForm = () => {
    setEditingId(null);
    setStartDate(today);
    setEndDate(today);
    setFlowIntensity('medium');
    setNotes('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (endDate < startDate) {
      setError('End date cannot be earlier than start date.');
      return;
    }

    setSubmitting(true);
    try {
      if (editingId) {
        await apiFetch(`/api/periods/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify({ startDate, endDate, flowIntensity, notes }),
        });
        setSuccess('Period record updated.');
      } else {
        await apiFetch('/api/periods', {
          method: 'POST',
          body: JSON.stringify({ startDate, endDate, flowIntensity, notes }),
        });
        setSuccess('Period record saved.');
      }
      resetForm();
      await loadPeriods();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save period');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (p: PeriodRecord) => {
    setEditingId(p.id);
    setStartDate(p.startDate);
    setEndDate(p.endDate);
    setFlowIntensity(p.flowIntensity);
    setNotes(p.notes || '');
    setError('');
    setSuccess('');
  };

  const handleDelete = async (id: string) => {
    setError('');
    setSuccess('');
    try {
      await apiFetch(`/api/periods/${id}`, { method: 'DELETE' });
      if (editingId === id) resetForm();
      setSuccess('Period record deleted.');
      await loadPeriods();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete record');
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold">Period Tracker</h1>
        <p className="mt-1 text-sm text-[#594B53] dark:text-[#BFB2BA]">
          Record your menstrual start and end dates, flow intensity, and personal notes. Overlapping or duplicate entries are automatically prevented.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-5 rounded-2xl border border-[#E6DFD7] dark:border-[#352E38] bg-[#FFFFFF] dark:bg-[#1D191F] p-6 space-y-4"
        >
          <h2 className="font-display text-xl font-semibold">
            {editingId ? 'Edit Period Record' : 'Log a Period'}
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#594B53] dark:text-[#BFB2BA] mb-1.5">
                Start Date
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-xl border border-[#DFD6CE] dark:border-[#3C333F] bg-[#FAF8F6] dark:bg-[#141115] px-3.5 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#594B53] dark:text-[#BFB2BA] mb-1.5">
                End Date
              </label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-xl border border-[#DFD6CE] dark:border-[#3C333F] bg-[#FAF8F6] dark:bg-[#141115] px-3.5 py-2.5 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#594B53] dark:text-[#BFB2BA] mb-1.5">
              Flow Intensity
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['spotting', 'light', 'medium', 'heavy'] as FlowIntensity[]).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setFlowIntensity(lvl)}
                  className={`py-2 px-2 rounded-xl text-xs font-medium capitalize border cursor-pointer ${
                    flowIntensity === lvl
                      ? 'bg-[#9D4E63] text-white border-[#9D4E63]'
                      : 'border-[#DFD6CE] dark:border-[#3C333F] text-[#594B53] dark:text-[#BFB2BA]'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#594B53] dark:text-[#BFB2BA] mb-1.5">
              Notes (optional)
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Cramps, flow changes, or helpful observations..."
              className="w-full rounded-xl border border-[#DFD6CE] dark:border-[#3C333F] bg-[#FAF8F6] dark:bg-[#141115] px-3.5 py-2 text-sm"
            />
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 rounded-xl bg-[#9D4E63] hover:bg-[#843E51] text-white text-sm font-medium cursor-pointer disabled:opacity-60"
            >
              {submitting ? 'Saving...' : editingId ? 'Update Period' : 'Save Period'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2.5 rounded-xl border border-[#DFD6CE] dark:border-[#3C333F] text-sm font-medium cursor-pointer"
              >
                Cancel
              </button>
            )}
          </div>
        </form>

        {/* Period History */}
        <section className="lg:col-span-7 rounded-2xl border border-[#E6DFD7] dark:border-[#352E38] bg-[#FFFFFF] dark:bg-[#1D191F] p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-semibold">Period History</h2>
            <span className="text-xs text-[#6E5D66] dark:text-[#A598A0] tabular-nums">
              {periods.length} logged {periods.length === 1 ? 'entry' : 'entries'}
            </span>
          </div>

          {loading ? (
            <div className="h-40 rounded-xl bg-[#FAF8F6] dark:bg-[#141115] animate-pulse" />
          ) : periods.length === 0 ? (
            <div className="py-12 text-center text-sm text-[#6E5D66] dark:text-[#A598A0]">
              No periods logged yet. Use the form on the left to record your first cycle.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-[#EFEAE4] dark:border-[#2D2630] text-xs text-[#6E5D66] dark:text-[#A598A0]">
                    <th className="py-2.5 pr-4 font-medium">Dates</th>
                    <th className="py-2.5 px-3 font-medium text-right">Duration</th>
                    <th className="py-2.5 px-3 font-medium">Flow</th>
                    <th className="py-2.5 px-3 font-medium">Notes</th>
                    <th className="py-2.5 pl-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFEAE4] dark:divide-[#2D2630]">
                  {periods.map((p) => {
                    const days = Math.max(1, diffDaysISO(p.startDate, p.endDate) + 1);
                    return (
                      <tr key={p.id} className="hover:bg-[#FAF8F6] dark:hover:bg-[#161318]">
                        <td className="py-3 pr-4 font-mono-num text-xs sm:text-sm whitespace-nowrap">
                          {p.startDate} → {p.endDate}
                        </td>
                        <td className="py-3 px-3 text-right tabular-nums whitespace-nowrap">
                          {days} {days === 1 ? 'day' : 'days'}
                        </td>
                        <td className="py-3 px-3 capitalize whitespace-nowrap">{p.flowIntensity}</td>
                        <td className="py-3 px-3 text-xs text-[#594B53] dark:text-[#BFB2BA] max-w-[180px] truncate">
                          {p.notes || '—'}
                        </td>
                        <td className="py-3 pl-3 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleEdit(p)}
                            className="p-1.5 rounded-lg text-[#594B53] hover:text-[#9D4E63] hover:bg-[#F5E7EB] dark:text-[#BFB2BA] dark:hover:bg-[#3A232C] cursor-pointer"
                            aria-label={`Edit period ${p.startDate}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(p.id)}
                            className="ml-1 p-1.5 rounded-lg text-[#594B53] hover:text-[#B84359] hover:bg-[#FDF2F4] dark:text-[#BFB2BA] dark:hover:bg-[#381C24] cursor-pointer"
                            aria-label={`Delete period ${p.startDate}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
