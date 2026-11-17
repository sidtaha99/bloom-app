import {
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Download,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import type {
  CalendarDayInfo,
  CalendarMonthResponse,
  MoodEntry,
  PeriodRecord,
  SymptomEntry,
  WellnessEntry,
} from '../../shared/types';
import { QuickLogModal, type QuickLogKind } from '../components/QuickLogModal';
import { apiFetch, downloadFileFromApi } from '../lib/api';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function CalendarPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getUTCFullYear());
  const [month, setMonth] = useState(now.getUTCMonth() + 1);
  const [calendar, setCalendar] = useState<CalendarMonthResponse | null>(null);
  const [selectedDay, setSelectedDay] = useState<CalendarDayInfo | null>(null);
  const [periods, setPeriods] = useState<PeriodRecord[]>([]);
  const [symptoms, setSymptoms] = useState<SymptomEntry[]>([]);
  const [moods, setMoods] = useState<MoodEntry[]>([]);
  const [wellness, setWellness] = useState<WellnessEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalKind, setModalKind] = useState<QuickLogKind | null>(null);

  // ICS Export modal state
  const [icsModalOpen, setIcsModalOpen] = useState(false);
  const [icsCycles, setIcsCycles] = useState<3 | 6>(3);
  const [icsDiscreet, setIcsDiscreet] = useState(false);
  const [icsIncludeFertile, setIcsIncludeFertile] = useState(true);
  const [icsExporting, setIcsExporting] = useState(false);
  const [icsError, setIcsError] = useState('');
  const [icsSuccess, setIcsSuccess] = useState('');

  const loadMonthData = useCallback(async () => {
    setLoading(true);
    try {
      const [cal, pRes, sRes, mRes, wRes] = await Promise.all([
        apiFetch<CalendarMonthResponse>(`/api/cycle/calendar?year=${year}&month=${month}`),
        apiFetch<{ periods: PeriodRecord[] }>('/api/periods'),
        apiFetch<{ symptoms: SymptomEntry[] }>('/api/symptoms'),
        apiFetch<{ moods: MoodEntry[] }>('/api/moods'),
        apiFetch<{ wellness: WellnessEntry[] }>('/api/wellness'),
      ]);
      setCalendar(cal);
      setPeriods(pRes.periods);
      setSymptoms(sRes.symptoms);
      setMoods(mRes.moods);
      setWellness(wRes.wellness);
      setSelectedDay((prev) => {
        if (prev) {
          const match = cal.days.find((d) => d.date === prev.date);
          if (match) return match;
        }
        return cal.days.find((d) => d.isToday) || cal.days.find((d) => d.inCurrentMonth) || null;
      });
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    loadMonthData();
  }, [loadMonthData]);

  const goPrevMonth = () => {
    if (month === 1) {
      setYear((y) => y - 1);
      setMonth(12);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const goNextMonth = () => {
    if (month === 12) {
      setYear((y) => y + 1);
      setMonth(1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const goToday = () => {
    const todayNow = new Date();
    setYear(todayNow.getUTCFullYear());
    setMonth(todayNow.getUTCMonth() + 1);
  };

  const handleDeletePeriod = async (periodId: string) => {
    await apiFetch(`/api/periods/${periodId}`, { method: 'DELETE' });
    await loadMonthData();
  };

  const handleExportICS = async () => {
    setIcsError('');
    setIcsSuccess('');
    setIcsExporting(true);
    try {
      const qs = new URLSearchParams({
        cycles: String(icsCycles),
        discreet: String(icsDiscreet),
        includeFertile: String(icsIncludeFertile),
      });
      await downloadFileFromApi(
        `/api/cycle/export.ics?${qs.toString()}`,
        'bloom-cycle-schedule.ics'
      );
      setIcsSuccess(
        `Downloaded .ics schedule for your next ${icsCycles} estimated cycles. Import it into Google, Apple, or Outlook Calendar.`
      );
    } catch (err) {
      setIcsError(err instanceof Error ? err.message : 'Unable to generate .ics file');
    } finally {
      setIcsExporting(false);
    }
  };

  const selectedPeriod = selectedDay
    ? periods.find((p) => selectedDay.date >= p.startDate && selectedDay.date <= p.endDate)
    : undefined;
  const selectedSymptoms = selectedDay
    ? symptoms.filter((s) => s.date === selectedDay.date)
    : [];
  const selectedMoods = selectedDay ? moods.filter((m) => m.date === selectedDay.date) : [];
  const selectedWellness = selectedDay
    ? wellness.filter((w) => w.date === selectedDay.date)
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">Menstrual Calendar</h1>
          <p className="mt-1 text-sm text-[#594B53] dark:text-[#BFB2BA]">
            Confirmed logged periods appear solid; predicted cycle windows are clearly marked as estimates.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              setIcsError('');
              setIcsSuccess('');
              setIcsModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#DFD6CE] dark:border-[#3C333F] bg-[#FFFFFF] dark:bg-[#1D191F] hover:border-[#9D4E63] text-xs font-medium transition-colors whitespace-nowrap cursor-pointer"
          >
            <CalendarPlus className="h-4 w-4 text-[#9D4E63] dark:text-[#E097AA]" />
            Export to Calendar
          </button>

          <div className="inline-flex items-center gap-1.5 bg-[#FFFFFF] dark:bg-[#1D191F] p-1 rounded-xl border border-[#DFD6CE] dark:border-[#3C333F]">
            <button
              type="button"
              onClick={goPrevMonth}
              className="p-2 rounded-lg hover:bg-[#F5F0EC] dark:hover:bg-[#262129] cursor-pointer"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[140px] text-center font-display text-base font-semibold tabular-nums px-1">
              {MONTH_NAMES[month - 1]} {year}
            </span>
            <button
              type="button"
              onClick={goNextMonth}
              className="p-2 rounded-lg hover:bg-[#F5F0EC] dark:hover:bg-[#262129] cursor-pointer"
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={goToday}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#9D4E63] dark:text-[#E097AA] hover:bg-[#F5E7EB] dark:hover:bg-[#3A232C] cursor-pointer"
            >
              Today
            </button>
          </div>
        </div>
      </div>

      {/* Clear Color + Pattern Legend */}
      <div className="rounded-2xl border border-[#E6DFD7] dark:border-[#352E38] bg-[#FFFFFF] dark:bg-[#1D191F] px-5 py-3.5 flex flex-wrap items-center justify-between gap-4 text-xs text-[#594B53] dark:text-[#BFB2BA]">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <span className="inline-flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-md bg-[#B85D74]" aria-hidden="true" />
            Confirmed Period
          </span>
          <span className="inline-flex items-center gap-2">
            <span
              className="w-3.5 h-3.5 rounded-md border-2 border-dashed border-[#C97B8E] bg-[#F8E9ED] dark:bg-[#3A222A]"
              aria-hidden="true"
            />
            Estimated Period
          </span>
          <span className="inline-flex items-center gap-2">
            <span
              className="w-3.5 h-3.5 rounded-md bg-[#E6ECE7] dark:bg-[#24332A] border border-[#789683]"
              aria-hidden="true"
            />
            Est. Fertile Window
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-full bg-[#8E78AD]" aria-hidden="true" />
            Est. Ovulation
          </span>
          <span className="inline-flex items-center gap-2">
            <span
              className="w-3.5 h-3.5 rounded-md ring-2 ring-[#2B2328] dark:ring-[#F4EEF2]"
              aria-hidden="true"
            />
            Today
          </span>
        </div>

        <div className="flex items-center gap-4 text-[11px] text-[#7A6B74] dark:text-[#968991]">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#9D4E63]" /> Symptom
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#7E6B9B]" /> Mood
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#5C7A67]" /> Wellness
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Monthly Grid */}
        <div className="lg:col-span-8 rounded-2xl border border-[#E6DFD7] dark:border-[#352E38] bg-[#FFFFFF] dark:bg-[#1D191F] p-4 sm:p-6">
          <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-medium text-[#6E5D66] dark:text-[#A598A0] mb-2">
            {WEEKDAYS.map((wd) => (
              <div key={wd} className="py-1.5">
                {wd}
              </div>
            ))}
          </div>

          {loading && !calendar ? (
            <div className="h-80 rounded-xl bg-[#FAF8F6] dark:bg-[#141115] animate-pulse" />
          ) : (
            <div className="grid grid-cols-7 gap-1.5">
              {calendar?.days.map((day) => {
                const isSelected = selectedDay?.date === day.date;

                let cellStyle =
                  'bg-[#FAF8F6] dark:bg-[#161318] text-[#2B2328] dark:text-[#F4EEF2] border-[#EFEAE4] dark:border-[#2C2630] hover:border-[#C9BFC5] dark:hover:border-[#4F4454]';
                if (!day.inCurrentMonth) {
                  cellStyle =
                    'bg-transparent text-[#A89AA2] dark:text-[#685D65] border-transparent opacity-55';
                } else if (day.isLoggedPeriod) {
                  cellStyle = 'bg-[#B85D74] text-white border-[#9D4E63] font-semibold';
                } else if (day.isEstimatedPeriod) {
                  cellStyle =
                    'bg-[#F9EAEF] dark:bg-[#38212A] text-[#843E51] dark:text-[#F0B4C2] border-dashed border-[#C97B8E]';
                } else if (day.isEstimatedOvulation) {
                  cellStyle =
                    'bg-[#ECE6F4] dark:bg-[#322840] text-[#543F73] dark:text-[#D9CCEE] border-[#8E78AD] font-semibold';
                } else if (day.isEstimatedFertile) {
                  cellStyle =
                    'bg-[#E8F0EB] dark:bg-[#223027] text-[#355340] dark:text-[#B4D6BF] border-[#789683]';
                }

                return (
                  <button
                    key={day.date}
                    type="button"
                    onClick={() => setSelectedDay(day)}
                    className={`relative min-h-[56px] sm:min-h-[72px] p-1.5 sm:p-2 rounded-xl border text-left flex flex-col justify-between transition-colors cursor-pointer ${cellStyle} ${
                      day.isToday ? 'ring-2 ring-[#2B2328] dark:ring-[#F4EEF2]' : ''
                    } ${isSelected ? 'outline-2 outline-offset-1 outline-[#9D4E63]' : ''}`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs sm:text-sm tabular-nums">{day.dayOfMonth}</span>
                      {day.isEstimatedOvulation && !day.isLoggedPeriod && (
                        <span
                          className="w-2 h-2 rounded-full bg-[#8E78AD]"
                          title="Estimated ovulation"
                        />
                      )}
                    </div>

                    <div className="flex items-center justify-between w-full mt-1">
                      <div className="flex items-center gap-1">
                        {day.hasSymptoms && (
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              day.isLoggedPeriod ? 'bg-white' : 'bg-[#9D4E63]'
                            }`}
                            title="Symptoms logged"
                          />
                        )}
                        {day.mood && (
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              day.isLoggedPeriod ? 'bg-white/80' : 'bg-[#7E6B9B]'
                            }`}
                            title={`Mood: ${day.mood}`}
                          />
                        )}
                        {day.hasWellness && (
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              day.isLoggedPeriod ? 'bg-white/80' : 'bg-[#5C7A67]'
                            }`}
                            title="Wellness logged"
                          />
                        )}
                      </div>
                      {day.inCurrentMonth && day.cycleDay && (
                        <span
                          className={`hidden sm:inline text-[10px] tabular-nums ${
                            day.isLoggedPeriod
                              ? 'text-white/80'
                              : 'text-[#8A7A83] dark:text-[#8E8189]'
                          }`}
                        >
                          D{day.cycleDay}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Date Inspector */}
        <aside className="lg:col-span-4 rounded-2xl border border-[#E6DFD7] dark:border-[#352E38] bg-[#FFFFFF] dark:bg-[#1D191F] p-6 space-y-5">
          {selectedDay ? (
            <>
              <div>
                <p className="text-xs text-[#6E5D66] dark:text-[#A598A0]">Selected Date</p>
                <h2 className="font-display text-2xl font-semibold tabular-nums">
                  {selectedDay.date}
                </h2>
                <p className="mt-1 text-xs text-[#594B53] dark:text-[#BFB2BA]">
                  {selectedDay.cycleDay
                    ? `Estimated Cycle Day ${selectedDay.cycleDay}`
                    : 'Cycle day unavailable'}
                  {selectedDay.estimatedPhase ? ` · ${selectedDay.estimatedPhase} phase` : ''}
                </p>
              </div>

              <div className="space-y-2 text-xs">
                {selectedDay.isLoggedPeriod && selectedPeriod && (
                  <div className="p-3 rounded-xl bg-[#FDF2F5] dark:bg-[#3A222A] text-[#843E51] dark:text-[#F0B4C2] flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold capitalize">
                        Confirmed Period ({selectedPeriod.flowIntensity} flow)
                      </p>
                      <p className="mt-0.5 text-[11px] opacity-85 tabular-nums">
                        {selectedPeriod.startDate} to {selectedPeriod.endDate}
                      </p>
                      {selectedPeriod.notes && (
                        <p className="mt-1 text-[11px] opacity-90">{selectedPeriod.notes}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeletePeriod(selectedPeriod.id)}
                      className="p-1.5 rounded-lg hover:bg-[#F3D7E0] dark:hover:bg-[#522D39] shrink-0 cursor-pointer"
                      title="Delete logged period"
                      aria-label="Delete logged period"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
                {selectedDay.isEstimatedPeriod && (
                  <p className="p-3 rounded-xl border border-dashed border-[#C97B8E] text-[#843E51] dark:text-[#F0B4C2]">
                    Estimated Period Day (prediction)
                  </p>
                )}
                {selectedDay.isEstimatedOvulation && (
                  <p className="p-3 rounded-xl bg-[#ECE6F4] dark:bg-[#322840] text-[#543F73] dark:text-[#D9CCEE]">
                    Estimated Ovulation Date (prediction)
                  </p>
                )}
                {selectedDay.isEstimatedFertile && !selectedDay.isEstimatedOvulation && (
                  <p className="p-3 rounded-xl bg-[#E8F0EB] dark:bg-[#223027] text-[#355340] dark:text-[#B4D6BF]">
                    Estimated Fertile Window (prediction)
                  </p>
                )}
              </div>

              <div className="space-y-3 pt-2 border-t border-[#EFEAE4] dark:border-[#2D2630] text-sm">
                <div>
                  <h3 className="text-xs font-semibold text-[#6E5D66] dark:text-[#A598A0]">
                    Logged Symptoms
                  </h3>
                  {selectedSymptoms.length > 0 ? (
                    <ul className="mt-1 space-y-1 text-xs">
                      {selectedSymptoms.map((s) => (
                        <li key={s.id}>
                          {[...s.physicalSymptoms, ...s.emotionalSymptoms, s.otherSymptomText]
                            .filter(Boolean)
                            .join(', ')}{' '}
                          (Severity {s.severity}/5)
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-xs text-[#83737C]">None logged</p>
                  )}
                </div>

                <div>
                  <h3 className="text-xs font-semibold text-[#6E5D66] dark:text-[#A598A0]">
                    Logged Mood
                  </h3>
                  {selectedMoods.length > 0 ? (
                    <p className="mt-1 text-xs capitalize">
                      {selectedMoods.map((m) => m.mood).join(', ')}
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-[#83737C]">None logged</p>
                  )}
                </div>

                <div>
                  <h3 className="text-xs font-semibold text-[#6E5D66] dark:text-[#A598A0]">
                    Daily Wellness
                  </h3>
                  {selectedWellness.length > 0 ? (
                    <p className="mt-1 text-xs tabular-nums">
                      {selectedWellness[0].waterIntakeMl} ml water ·{' '}
                      {selectedWellness[0].sleepHours} hrs sleep ·{' '}
                      {selectedWellness[0].physicalActivityMinutes} min activity
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-[#83737C]">None logged</p>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-[#EFEAE4] dark:border-[#2D2630] space-y-2">
                <p className="text-xs font-medium text-[#594B53] dark:text-[#BFB2BA]">
                  Quick Log for {selectedDay.date}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setModalKind('period')}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#9D4E63] hover:bg-[#843E51] text-white text-xs font-medium cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" /> Period
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalKind('symptom')}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-[#DFD6CE] dark:border-[#3C333F] text-xs font-medium hover:bg-[#F5F0EC] dark:hover:bg-[#262129] cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" /> Symptom
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalKind('mood')}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-[#DFD6CE] dark:border-[#3C333F] text-xs font-medium hover:bg-[#F5F0EC] dark:hover:bg-[#262129] cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" /> Mood
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalKind('wellness')}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-[#DFD6CE] dark:border-[#3C333F] text-xs font-medium hover:bg-[#F5F0EC] dark:hover:bg-[#262129] cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" /> Wellness
                  </button>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-[#6E5D66]">
              Select any date on the calendar to inspect details.
            </p>
          )}
        </aside>
      </div>

      {calendar?.disclaimer && (
        <p className="text-xs text-[#6E5D66] dark:text-[#A598A0]">{calendar.disclaimer}</p>
      )}

      {/* iCalendar (.ics) Export Modal */}
      {icsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-[1px]">
          <div className="w-full max-w-md rounded-2xl border border-[#E6DFD7] dark:border-[#352E38] bg-[#FFFFFF] dark:bg-[#1D191F] shadow-xl">
            <div className="px-6 py-4 border-b border-[#E6DFD7] dark:border-[#352E38] flex items-center justify-between">
              <h3 className="font-display text-xl font-semibold">
                Export Cycle Schedule (.ics)
              </h3>
              <button
                type="button"
                onClick={() => setIcsModalOpen(false)}
                className="p-1.5 rounded-lg text-[#6E5D66] hover:bg-[#F5F0EC] dark:hover:bg-[#262129]"
                aria-label="Close export modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 text-sm">
              <p className="text-xs text-[#594B53] dark:text-[#BFB2BA] leading-relaxed">
                Download an iCalendar (.ics) file containing your upcoming estimated cycle phases to import into Google Calendar, Apple Calendar, or Outlook. Events are marked as free/transparent so they won&apos;t block your schedule.
              </p>

              {icsError && (
                <div className="p-3 rounded-xl border border-[#D89AA7] bg-[#FDF2F4] dark:bg-[#381C24] text-xs text-[#8C2D42] dark:text-[#F4B4C2]">
                  {icsError}
                </div>
              )}
              {icsSuccess && (
                <div className="p-3 rounded-xl border border-[#C9D8CD] bg-[#F2F7F4] dark:bg-[#1D2A22] text-xs text-[#365341] dark:text-[#A9D1B8]">
                  {icsSuccess}
                </div>
              )}

              <div>
                <p className="text-xs font-medium text-[#594B53] dark:text-[#BFB2BA] mb-2">
                  Upcoming Cycles to Export
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setIcsCycles(3)}
                    className={`py-2 px-3 rounded-xl text-xs font-medium border cursor-pointer ${
                      icsCycles === 3
                        ? 'bg-[#9D4E63] text-white border-[#9D4E63]'
                        : 'border-[#DFD6CE] dark:border-[#3C333F]'
                    }`}
                  >
                    Next 3 Cycles (~3 months)
                  </button>
                  <button
                    type="button"
                    onClick={() => setIcsCycles(6)}
                    className={`py-2 px-3 rounded-xl text-xs font-medium border cursor-pointer ${
                      icsCycles === 6
                        ? 'bg-[#9D4E63] text-white border-[#9D4E63]'
                        : 'border-[#DFD6CE] dark:border-[#3C333F]'
                    }`}
                  >
                    Next 6 Cycles (~6 months)
                  </button>
                </div>
              </div>

              <div className="space-y-2.5 text-xs">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={icsDiscreet}
                    onChange={(e) => setIcsDiscreet(e.target.checked)}
                    className="mt-0.5 accent-[#9D4E63]"
                  />
                  <span>
                    <span className="font-medium text-[#2B2328] dark:text-[#F4EEF2]">
                      Discreet event titles
                    </span>{' '}
                    — uses quiet labels like &ldquo;Bloom · Phase 1 (Rest)&rdquo; instead of menstrual terms for shared work calendars.
                  </span>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={icsIncludeFertile}
                    onChange={(e) => setIcsIncludeFertile(e.target.checked)}
                    className="mt-0.5 accent-[#9D4E63]"
                  />
                  <span>
                    Include estimated fertile window &amp; estimated ovulation day markers
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIcsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#DFD6CE] dark:border-[#3C333F] text-xs font-medium cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleExportICS}
                  disabled={icsExporting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#9D4E63] hover:bg-[#843E51] text-white text-xs font-medium cursor-pointer disabled:opacity-60"
                >
                  <Download className="h-3.5 w-3.5" />
                  {icsExporting ? 'Generating...' : 'Download .ics File'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {modalKind && (
        <QuickLogModal
          kind={modalKind}
          initialDate={selectedDay?.date}
          onClose={() => setModalKind(null)}
          onSaved={loadMonthData}
        />
      )}
    </div>
  );
}
