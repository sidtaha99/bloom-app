import { X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import type {
  EmotionalSymptomType,
  FlowIntensity,
  MoodType,
  PhysicalSymptomType,
} from '../../shared/types';
import { apiFetch } from '../lib/api';

export type QuickLogKind = 'period' | 'symptom' | 'mood' | 'wellness';

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

const MOODS: { value: MoodType; label: string }[] = [
  { value: 'happy', label: 'Happy' },
  { value: 'calm', label: 'Calm' },
  { value: 'energetic', label: 'Energetic' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'anxious', label: 'Anxious' },
  { value: 'sad', label: 'Sad' },
  { value: 'irritable', label: 'Irritable' },
  { value: 'tired', label: 'Tired' },
];

export function QuickLogModal({
  kind,
  initialDate,
  onClose,
  onSaved,
}: {
  kind: QuickLogKind;
  initialDate?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const today = initialDate || new Date().toISOString().slice(0, 10);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Period state
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [flowIntensity, setFlowIntensity] = useState<FlowIntensity>('medium');
  const [notes, setNotes] = useState('');

  // Symptom state
  const [date, setDate] = useState(today);
  const [physical, setPhysical] = useState<string[]>([]);
  const [emotional, setEmotional] = useState<string[]>([]);
  const [otherSymptomText, setOtherSymptomText] = useState('');
  const [severity, setSeverity] = useState(2);

  // Mood state
  const [mood, setMood] = useState<MoodType>('calm');

  // Wellness state
  const [waterIntakeMl, setWaterIntakeMl] = useState(1750);
  const [sleepHours, setSleepHours] = useState(7.5);
  const [physicalActivityMinutes, setPhysicalActivityMinutes] = useState(30);
  const [exerciseType, setExerciseType] = useState('Walking');
  const [energyLevel, setEnergyLevel] = useState(3);

  const toggleItem = (list: string[], setList: (v: string[]) => void, item: string) => {
    setList(list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (kind === 'period') {
        await apiFetch('/api/periods', {
          method: 'POST',
          body: JSON.stringify({ startDate, endDate, flowIntensity, notes }),
        });
      } else if (kind === 'symptom') {
        await apiFetch('/api/symptoms', {
          method: 'POST',
          body: JSON.stringify({
            date,
            physicalSymptoms: physical,
            emotionalSymptoms: emotional,
            otherSymptomText,
            severity,
            notes,
          }),
        });
      } else if (kind === 'mood') {
        await apiFetch('/api/moods', {
          method: 'POST',
          body: JSON.stringify({ date, mood, notes }),
        });
      } else {
        await apiFetch('/api/wellness', {
          method: 'POST',
          body: JSON.stringify({
            date,
            waterIntakeMl,
            sleepHours,
            physicalActivityMinutes,
            exerciseType,
            energyLevel,
            selfCareNotes: notes,
          }),
        });
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save entry');
    } finally {
      setSubmitting(false);
    }
  };

  const titles: Record<QuickLogKind, string> = {
    period: 'Log Period',
    symptom: 'Log Symptoms',
    mood: 'Log Mood',
    wellness: 'Log Daily Wellness',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-[1px]">
      <div className="w-full max-w-lg rounded-2xl border border-[#E6DFD7] dark:border-[#352E38] bg-[#FFFFFF] dark:bg-[#1D191F] shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-[#E6DFD7] dark:border-[#352E38] flex items-center justify-between">
          <h3 className="font-display text-xl font-semibold text-[#2B2328] dark:text-[#F4EEF2]">
            {titles[kind]}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#6E5D66] dark:text-[#BFB2BA] hover:bg-[#F5F0EC] dark:hover:bg-[#262129]"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl border border-[#D89AA7] bg-[#FDF2F4] dark:bg-[#381C24] dark:border-[#6F3645] text-sm text-[#8C2D42] dark:text-[#F4B4C2]">
              {error}
            </div>
          )}

          {kind === 'period' && (
            <>
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
                    className="w-full rounded-xl border border-[#DFD6CE] dark:border-[#3C333F] bg-[#FAF8F6] dark:bg-[#141115] px-3.5 py-2.5 text-sm text-[#2B2328] dark:text-[#F4EEF2]"
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
                    className="w-full rounded-xl border border-[#DFD6CE] dark:border-[#3C333F] bg-[#FAF8F6] dark:bg-[#141115] px-3.5 py-2.5 text-sm text-[#2B2328] dark:text-[#F4EEF2]"
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
                      className={`py-2 px-2 rounded-xl text-xs font-medium capitalize border transition-colors cursor-pointer ${
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
            </>
          )}

          {kind !== 'period' && (
            <div>
              <label className="block text-xs font-medium text-[#594B53] dark:text-[#BFB2BA] mb-1.5">
                Date
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border border-[#DFD6CE] dark:border-[#3C333F] bg-[#FAF8F6] dark:bg-[#141115] px-3.5 py-2.5 text-sm text-[#2B2328] dark:text-[#F4EEF2]"
              />
            </div>
          )}

          {kind === 'symptom' && (
            <>
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
                  Other symptom (optional)
                </label>
                <input
                  type="text"
                  value={otherSymptomText}
                  onChange={(e) => setOtherSymptomText(e.target.value)}
                  placeholder="Describe any other physical or emotional symptom"
                  className="w-full rounded-xl border border-[#DFD6CE] dark:border-[#3C333F] bg-[#FAF8F6] dark:bg-[#141115] px-3.5 py-2 text-sm text-[#2B2328] dark:text-[#F4EEF2]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#594B53] dark:text-[#BFB2BA] mb-1.5">
                  Severity ({severity}/5)
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
            </>
          )}

          {kind === 'mood' && (
            <div>
              <p className="text-xs font-medium text-[#594B53] dark:text-[#BFB2BA] mb-2">
                How are you feeling?
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {MOODS.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setMood(m.value)}
                    className={`py-2.5 px-3 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                      mood === m.value
                        ? 'bg-[#9D4E63] text-white border-[#9D4E63]'
                        : 'border-[#DFD6CE] dark:border-[#3C333F] text-[#594B53] dark:text-[#BFB2BA]'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {kind === 'wellness' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  Sleep Duration (hours)
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
                  placeholder="Yoga, Walking, Strength..."
                  className="w-full rounded-xl border border-[#DFD6CE] dark:border-[#3C333F] bg-[#FAF8F6] dark:bg-[#141115] px-3.5 py-2 text-sm"
                />
              </div>
              <div className="sm:col-span-2">
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
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-[#594B53] dark:text-[#BFB2BA] mb-1.5">
              Optional Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add personal reflections or context..."
              className="w-full rounded-xl border border-[#DFD6CE] dark:border-[#3C333F] bg-[#FAF8F6] dark:bg-[#141115] px-3.5 py-2 text-sm text-[#2B2328] dark:text-[#F4EEF2]"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[#DFD6CE] dark:border-[#3C333F] text-sm font-medium text-[#594B53] dark:text-[#BFB2BA] hover:bg-[#F5F0EC] dark:hover:bg-[#262129] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-[#9D4E63] hover:bg-[#843E51] text-white text-sm font-medium disabled:opacity-60 cursor-pointer"
            >
              {submitting ? 'Saving...' : 'Save Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
