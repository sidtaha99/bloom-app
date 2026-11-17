import { BellRing, Clock, Download, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import type {
  CustomReminder,
  CycleRegularity,
  CycleSettingsDTO,
  UserProfile,
} from '../../shared/types';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { apiFetch, downloadFileFromApi } from '../lib/api';
import {
  dispatchBackgroundNotification,
  isNotificationSupported,
  requestNotificationPermission,
} from '../lib/notifications';

const COMMON_TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
];

export function ProfileSettingsPage() {
  const navigate = useNavigate();
  const { user, cycleSettings, setSessionData, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  const [fullName, setFullName] = useState(user?.fullName || '');
  const [dateOfBirth, setDateOfBirth] = useState(user?.dateOfBirth || '');
  const [timezone, setTimezone] = useState(user?.timezone || 'UTC');
  const [privacyShowEstimatesNotice, setPrivacyShowEstimatesNotice] = useState(
    user?.privacyShowEstimatesNotice ?? true
  );

  const [averageCycleLength, setAverageCycleLength] = useState(
    cycleSettings?.averageCycleLength || 29
  );
  const [averagePeriodDuration, setAveragePeriodDuration] = useState(
    cycleSettings?.averagePeriodDuration || 5
  );
  const [cycleRegularity, setCycleRegularity] = useState<CycleRegularity>(
    cycleSettings?.cycleRegularity || 'unsure'
  );
  const [dietPreference, setDietPreference] = useState<'all' | 'vegetarian' | 'non_vegetarian'>(
    cycleSettings?.trackingPreferences?.dietPreference || 'all'
  );

  const [upcomingPeriodReminders, setUpcomingPeriodReminders] = useState(
    cycleSettings?.notificationPreferences?.upcomingPeriodReminders ?? true
  );
  const [periodReminderDaysBefore, setPeriodReminderDaysBefore] = useState(
    cycleSettings?.notificationPreferences?.periodReminderDaysBefore ?? 2
  );
  const [periodReminderTime, setPeriodReminderTime] = useState(
    cycleSettings?.notificationPreferences?.periodReminderTime ?? '08:30'
  );
  const [wellnessReminders, setWellnessReminders] = useState(
    cycleSettings?.notificationPreferences?.wellnessReminders ?? true
  );
  const [wellnessReminderTime, setWellnessReminderTime] = useState(
    cycleSettings?.notificationPreferences?.wellnessReminderTime ?? '09:00'
  );
  const [hydrationReminders, setHydrationReminders] = useState(
    cycleSettings?.notificationPreferences?.hydrationReminders ?? false
  );
  const [hydrationReminderTime, setHydrationReminderTime] = useState(
    cycleSettings?.notificationPreferences?.hydrationReminderTime ?? '14:00'
  );
  const [browserNotificationsEnabled, setBrowserNotificationsEnabled] = useState(
    cycleSettings?.notificationPreferences?.browserNotificationsEnabled ?? false
  );

  // Custom timed reminders state
  const [customReminders, setCustomReminders] = useState<CustomReminder[]>([]);
  const [newRemTitle, setNewRemTitle] = useState('');
  const [newRemMsg, setNewRemMsg] = useState('');
  const [newRemTime, setNewRemTime] = useState('20:30');
  const [newRemFreq, setNewRemFreq] = useState<'daily' | 'once'>('daily');
  const [newRemDate, setNewRemDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [savingReminder, setSavingReminder] = useState(false);
  const [reminderMsg, setReminderMsg] = useState('');
  const [reminderErr, setReminderErr] = useState('');

  const [profileMsg, setProfileMsg] = useState('');
  const [profileErr, setProfileErr] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');
  const [passwordErr, setPasswordErr] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  // Delete account state
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteErr, setDeleteErr] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    apiFetch<{ reminders: CustomReminder[] }>('/api/notifications/reminders')
      .then((res) => setCustomReminders(res.reminders))
      .catch(() => {
        // ignore load error
      });
  }, []);

  const handleBrowserNotificationsToggle = async (checked: boolean) => {
    setProfileErr('');
    if (!checked) {
      setBrowserNotificationsEnabled(false);
      return;
    }
    if (!isNotificationSupported()) {
      setProfileErr('Browser notifications are not supported in this browser.');
      return;
    }
    const permission = await requestNotificationPermission();
    if (permission === 'granted') {
      setBrowserNotificationsEnabled(true);
      await dispatchBackgroundNotification(
        'Bloom Background Notifications Enabled',
        'Timed reminders and cycle alerts can now notify you even when Bloom is in the background.',
        { tag: 'bloom-enabled', url: '/settings' }
      );
    } else {
      setBrowserNotificationsEnabled(false);
      setProfileErr(
        permission === 'denied'
          ? 'Browser notifications are blocked in your browser site settings.'
          : 'Browser notification permission was not granted.'
      );
    }
  };

  const handleTestBackgroundNotification = async () => {
    setProfileErr('');
    setProfileMsg('');
    const permission = await requestNotificationPermission();
    if (permission !== 'granted') {
      setProfileErr('Please allow browser notification permission first.');
      return;
    }
    const sent = await dispatchBackgroundNotification(
      'Bloom Test Background Alert',
      'Your scheduled reminders and cycle alerts are working properly.',
      { tag: `bloom-test-${Date.now()}`, url: '/dashboard' }
    );
    if (sent) {
      setProfileMsg('Test background notification dispatched.');
    } else {
      setProfileErr('Unable to display notification in this embedded browser context.');
    }
  };

  const handleCreateCustomReminder = async (e: FormEvent) => {
    e.preventDefault();
    setReminderErr('');
    setReminderMsg('');
    setSavingReminder(true);
    try {
      const res = await apiFetch<{ reminder: CustomReminder }>('/api/notifications/reminders', {
        method: 'POST',
        body: JSON.stringify({
          title: newRemTitle,
          message: newRemMsg,
          reminderTime: newRemTime,
          frequency: newRemFreq,
          scheduledDate: newRemFreq === 'once' ? newRemDate : null,
        }),
      });
      setCustomReminders((prev) =>
        [...prev, res.reminder].sort((a, b) => a.reminderTime.localeCompare(b.reminderTime))
      );
      setNewRemTitle('');
      setNewRemMsg('');
      setReminderMsg(`Added timed reminder "${res.reminder.title}" at ${res.reminder.reminderTime}.`);
    } catch (err) {
      setReminderErr(err instanceof Error ? err.message : 'Unable to add reminder');
    } finally {
      setSavingReminder(false);
    }
  };

  const handleToggleCustomReminder = async (rem: CustomReminder) => {
    try {
      const res = await apiFetch<{ reminder: CustomReminder }>(
        `/api/notifications/reminders/${rem.id}`,
        {
          method: 'PUT',
          body: JSON.stringify({ enabled: !rem.enabled }),
        }
      );
      setCustomReminders((prev) => prev.map((r) => (r.id === rem.id ? res.reminder : r)));
    } catch {
      // ignore
    }
  };

  const handleDeleteCustomReminder = async (id: string) => {
    try {
      await apiFetch(`/api/notifications/reminders/${id}`, { method: 'DELETE' });
      setCustomReminders((prev) => prev.filter((r) => r.id !== id));
    } catch {
      // ignore
    }
  };

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setProfileMsg('');
    setProfileErr('');
    setSavingProfile(true);
    try {
      const data = await apiFetch<{ user: UserProfile; cycleSettings: CycleSettingsDTO }>(
        '/api/profile',
        {
          method: 'PUT',
          body: JSON.stringify({
            fullName,
            dateOfBirth,
            timezone,
            themePreference: theme,
            privacyShowEstimatesNotice,
            cycleSettings: {
              averageCycleLength,
              averagePeriodDuration,
              cycleRegularity,
              trackingPreferences: { dietPreference },
              notificationPreferences: {
                upcomingPeriodReminders,
                periodReminderDaysBefore,
                periodReminderTime,
                wellnessReminders,
                wellnessReminderTime,
                hydrationReminders,
                hydrationReminderTime,
                browserNotificationsEnabled,
              },
            },
          }),
        }
      );
      setSessionData(data.user, data.cycleSettings);
      setProfileMsg('Profile and preferences saved.');
    } catch (err) {
      setProfileErr(err instanceof Error ? err.message : 'Unable to update settings');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPasswordMsg('');
    setPasswordErr('');
    setSavingPassword(true);
    try {
      const data = await apiFetch<{ message: string }>('/api/profile/password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      setPasswordMsg(data.message);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordErr(err instanceof Error ? err.message : 'Unable to change password');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleDeleteAccount = async (e: FormEvent) => {
    e.preventDefault();
    setDeleteErr('');
    if (deleteConfirmText.trim().toUpperCase() !== 'DELETE') {
      setDeleteErr('Please type DELETE to confirm permanent account deletion.');
      return;
    }
    setDeleting(true);
    try {
      await apiFetch('/api/profile', {
        method: 'DELETE',
        body: JSON.stringify({ password: deletePassword }),
      });
      await logout();
      navigate('/');
    } catch (err) {
      setDeleteErr(err instanceof Error ? err.message : 'Unable to delete account');
      setDeleting(false);
    }
  };

  const tzList = COMMON_TIMEZONES.includes(timezone)
    ? COMMON_TIMEZONES
    : [timezone, ...COMMON_TIMEZONES];

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="font-display text-3xl font-semibold">Profile & Settings</h1>
        <p className="mt-1 text-sm text-[#594B53] dark:text-[#BFB2BA]">
          Manage your personal details, cycle estimates, timezone, reminder preferences, theme, and data ownership.
        </p>
      </div>

      {/* Main Profile & Cycle Form */}
      <form
        onSubmit={handleSaveProfile}
        className="rounded-2xl border border-[#E6DFD7] dark:border-[#352E38] bg-[#FFFFFF] dark:bg-[#1D191F] p-6 sm:p-8 space-y-6"
      >
        {profileErr && (
          <div className="p-3 rounded-xl border border-[#D89AA7] bg-[#FDF2F4] dark:bg-[#381C24] text-sm text-[#8C2D42] dark:text-[#F4B4C2]">
            {profileErr}
          </div>
        )}
        {profileMsg && (
          <div className="p-3 rounded-xl border border-[#C9D8CD] bg-[#F2F7F4] dark:bg-[#1D2A22] text-sm text-[#365341] dark:text-[#A9D1B8]">
            {profileMsg}
          </div>
        )}

        <div>
          <h2 className="font-display text-xl font-semibold mb-4">Personal Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#594B53] dark:text-[#BFB2BA] mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-xl border border-[#DFD6CE] dark:border-[#3C333F] bg-[#FAF8F6] dark:bg-[#141115] px-3.5 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#594B53] dark:text-[#BFB2BA] mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full rounded-xl border border-[#DFD6CE] dark:border-[#3C333F] bg-[#EFEAE4] dark:bg-[#262129] px-3.5 py-2.5 text-sm opacity-75"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#594B53] dark:text-[#BFB2BA] mb-1.5">
                Date of Birth
              </label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="w-full rounded-xl border border-[#DFD6CE] dark:border-[#3C333F] bg-[#FAF8F6] dark:bg-[#141115] px-3.5 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#594B53] dark:text-[#BFB2BA] mb-1.5">
                Timezone
              </label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full rounded-xl border border-[#DFD6CE] dark:border-[#3C333F] bg-[#FAF8F6] dark:bg-[#141115] px-3.5 py-2.5 text-sm"
              >
                {tzList.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="pt-5 border-t border-[#EFEAE4] dark:border-[#2D2630]">
          <h2 className="font-display text-xl font-semibold mb-4">Cycle Settings & Defaults</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#594B53] dark:text-[#BFB2BA] mb-1.5">
                Average Cycle Length (days)
              </label>
              <input
                type="number"
                min={18}
                max={60}
                value={averageCycleLength}
                onChange={(e) => setAverageCycleLength(Number(e.target.value))}
                className="w-full rounded-xl border border-[#DFD6CE] dark:border-[#3C333F] bg-[#FAF8F6] dark:bg-[#141115] px-3.5 py-2.5 text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#594B53] dark:text-[#BFB2BA] mb-1.5">
                Average Period Duration (days)
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
            <div>
              <label className="block text-xs font-medium text-[#594B53] dark:text-[#BFB2BA] mb-1.5">
                Cycle Regularity
              </label>
              <select
                value={cycleRegularity}
                onChange={(e) => setCycleRegularity(e.target.value as CycleRegularity)}
                className="w-full rounded-xl border border-[#DFD6CE] dark:border-[#3C333F] bg-[#FAF8F6] dark:bg-[#141115] px-3.5 py-2.5 text-sm"
              >
                <option value="regular">Regular</option>
                <option value="somewhat_irregular">Somewhat irregular</option>
                <option value="irregular">Irregular</option>
                <option value="unsure">Unsure</option>
              </select>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-xs font-medium text-[#594B53] dark:text-[#BFB2BA] mb-1.5">
              Nutrition Diet Preference
            </label>
            <select
              value={dietPreference}
              onChange={(e) =>
                setDietPreference(e.target.value as 'all' | 'vegetarian' | 'non_vegetarian')
              }
              className="rounded-xl border border-[#DFD6CE] dark:border-[#3C333F] bg-[#FAF8F6] dark:bg-[#141115] px-3.5 py-2 text-sm"
            >
              <option value="all">Show both vegetarian & non-vegetarian</option>
              <option value="vegetarian">Vegetarian focus</option>
              <option value="non_vegetarian">Non-vegetarian focus</option>
            </select>
          </div>
        </div>

        <div className="pt-5 border-t border-[#EFEAE4] dark:border-[#2D2630]">
          <h2 className="font-display text-xl font-semibold mb-4">
            Appearance & Notification Preferences
          </h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-4 py-1">
              <span>Color Theme</span>
              <div className="inline-flex p-1 rounded-xl border border-[#DFD6CE] dark:border-[#3C333F] bg-[#FAF8F6] dark:bg-[#141115]">
                <button
                  type="button"
                  onClick={() => setTheme('light')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium cursor-pointer ${
                    theme === 'light' ? 'bg-[#9D4E63] text-white' : ''
                  }`}
                >
                  Light
                </button>
                <button
                  type="button"
                  onClick={() => setTheme('dark')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium cursor-pointer ${
                    theme === 'dark' ? 'bg-[#9D4E63] text-white' : ''
                  }`}
                >
                  Dark
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 py-1">
              <label className="flex flex-wrap items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={upcomingPeriodReminders}
                  onChange={(e) => setUpcomingPeriodReminders(e.target.checked)}
                  className="accent-[#9D4E63]"
                />
                <span>Upcoming period reminders (notify</span>
                <input
                  type="number"
                  min={1}
                  max={7}
                  value={periodReminderDaysBefore}
                  onChange={(e) => setPeriodReminderDaysBefore(Number(e.target.value))}
                  className="w-14 rounded-lg border border-[#DFD6CE] dark:border-[#3C333F] bg-[#FAF8F6] dark:bg-[#141115] px-2 py-1 text-xs tabular-nums"
                />
                <span>days before)</span>
              </label>
              <label className="inline-flex items-center gap-1.5 text-xs text-[#6E5D66] dark:text-[#A598A0]">
                <Clock className="h-3.5 w-3.5" /> Time:
                <input
                  type="time"
                  value={periodReminderTime}
                  onChange={(e) => setPeriodReminderTime(e.target.value)}
                  className="rounded-lg border border-[#DFD6CE] dark:border-[#3C333F] bg-[#FAF8F6] dark:bg-[#141115] px-2 py-1 text-xs text-[#2B2328] dark:text-[#F4EEF2] tabular-nums"
                />
              </label>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 py-1">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={wellnessReminders}
                  onChange={(e) => setWellnessReminders(e.target.checked)}
                  className="accent-[#9D4E63]"
                />
                Daily wellness & mood check-in reminders
              </label>
              <label className="inline-flex items-center gap-1.5 text-xs text-[#6E5D66] dark:text-[#A598A0]">
                <Clock className="h-3.5 w-3.5" /> Time:
                <input
                  type="time"
                  value={wellnessReminderTime}
                  onChange={(e) => setWellnessReminderTime(e.target.value)}
                  className="rounded-lg border border-[#DFD6CE] dark:border-[#3C333F] bg-[#FAF8F6] dark:bg-[#141115] px-2 py-1 text-xs text-[#2B2328] dark:text-[#F4EEF2] tabular-nums"
                />
              </label>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 py-1">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hydrationReminders}
                  onChange={(e) => setHydrationReminders(e.target.checked)}
                  className="accent-[#9D4E63]"
                />
                Hydration reminders
              </label>
              <label className="inline-flex items-center gap-1.5 text-xs text-[#6E5D66] dark:text-[#A598A0]">
                <Clock className="h-3.5 w-3.5" /> Time:
                <input
                  type="time"
                  value={hydrationReminderTime}
                  onChange={(e) => setHydrationReminderTime(e.target.value)}
                  className="rounded-lg border border-[#DFD6CE] dark:border-[#3C333F] bg-[#FAF8F6] dark:bg-[#141115] px-2 py-1 text-xs text-[#2B2328] dark:text-[#F4EEF2] tabular-nums"
                />
              </label>
            </div>

            <div className="p-3.5 rounded-xl border border-[#E6DFD7] dark:border-[#352E38] bg-[#FAF8F6] dark:bg-[#141115] flex flex-wrap items-center justify-between gap-3">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={browserNotificationsEnabled}
                  onChange={(e) => handleBrowserNotificationsToggle(e.target.checked)}
                  className="accent-[#9D4E63]"
                />
                <div>
                  <span className="font-medium">Enable Background Notifications (Service Worker)</span>
                  <p className="text-[11px] text-[#6E5D66] dark:text-[#A598A0]">
                    Sends OS/browser notifications when scheduled reminder times arrive while Bloom is open or in a background tab.
                  </p>
                </div>
              </label>
              <button
                type="button"
                onClick={handleTestBackgroundNotification}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#DFD6CE] dark:border-[#3C333F] bg-[#FFFFFF] dark:bg-[#1D191F] text-xs font-medium hover:border-[#9D4E63] cursor-pointer"
              >
                <BellRing className="h-3.5 w-3.5 text-[#9D4E63] dark:text-[#E097AA]" />
                Send Test Alert
              </button>
            </div>

            <label className="flex items-center gap-2.5 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={privacyShowEstimatesNotice}
                onChange={(e) => setPrivacyShowEstimatesNotice(e.target.checked)}
                className="accent-[#9D4E63]"
              />
              Show clear estimate disclaimers across cycle cards
            </label>
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={savingProfile}
            className="px-6 py-2.5 rounded-xl bg-[#9D4E63] hover:bg-[#843E51] text-white text-sm font-medium cursor-pointer disabled:opacity-60"
          >
            {savingProfile ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>

      {/* Custom Timed Reminders Manager */}
      <section className="rounded-2xl border border-[#E6DFD7] dark:border-[#352E38] bg-[#FFFFFF] dark:bg-[#1D191F] p-6 sm:p-8 space-y-5">
        <div>
          <h2 className="font-display text-xl font-semibold">Custom Time Reminders</h2>
          <p className="mt-1 text-xs text-[#6E5D66] dark:text-[#A598A0]">
            Add personal timed reminders (e.g. evening herbal tea, supplements, rest break, or symptom check-in) delivered in-app and via background alerts.
          </p>
        </div>

        {reminderErr && (
          <div className="p-3 rounded-xl border border-[#D89AA7] bg-[#FDF2F4] dark:bg-[#381C24] text-sm text-[#8C2D42] dark:text-[#F4B4C2]">
            {reminderErr}
          </div>
        )}
        {reminderMsg && (
          <div className="p-3 rounded-xl border border-[#C9D8CD] bg-[#F2F7F4] dark:bg-[#1D2A22] text-sm text-[#365341] dark:text-[#A9D1B8]">
            {reminderMsg}
          </div>
        )}

        <form onSubmit={handleCreateCustomReminder} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <input
            type="text"
            required
            placeholder="Reminder title (e.g. Iron supplement)"
            value={newRemTitle}
            onChange={(e) => setNewRemTitle(e.target.value)}
            className="sm:col-span-4 rounded-xl border border-[#DFD6CE] dark:border-[#3C333F] bg-[#FAF8F6] dark:bg-[#141115] px-3.5 py-2 text-sm"
          />
          <input
            type="text"
            placeholder="Optional note"
            value={newRemMsg}
            onChange={(e) => setNewRemMsg(e.target.value)}
            className="sm:col-span-3 rounded-xl border border-[#DFD6CE] dark:border-[#3C333F] bg-[#FAF8F6] dark:bg-[#141115] px-3.5 py-2 text-sm"
          />
          <input
            type="time"
            required
            value={newRemTime}
            onChange={(e) => setNewRemTime(e.target.value)}
            className="sm:col-span-2 rounded-xl border border-[#DFD6CE] dark:border-[#3C333F] bg-[#FAF8F6] dark:bg-[#141115] px-3 py-2 text-sm tabular-nums"
          />
          <select
            value={newRemFreq}
            onChange={(e) => setNewRemFreq(e.target.value as 'daily' | 'once')}
            className="sm:col-span-2 rounded-xl border border-[#DFD6CE] dark:border-[#3C333F] bg-[#FAF8F6] dark:bg-[#141115] px-3 py-2 text-sm"
          >
            <option value="daily">Daily</option>
            <option value="once">One time</option>
          </select>
          <button
            type="submit"
            disabled={savingReminder}
            className="sm:col-span-1 inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl bg-[#9D4E63] hover:bg-[#843E51] text-white text-sm font-medium cursor-pointer disabled:opacity-60"
            title="Add reminder"
          >
            <Plus className="h-4 w-4" />
          </button>
          {newRemFreq === 'once' && (
            <div className="sm:col-span-4 flex items-center gap-2 text-xs text-[#594B53] dark:text-[#BFB2BA]">
              <span>Date:</span>
              <input
                type="date"
                value={newRemDate}
                onChange={(e) => setNewRemDate(e.target.value)}
                className="rounded-xl border border-[#DFD6CE] dark:border-[#3C333F] bg-[#FAF8F6] dark:bg-[#141115] px-3 py-1.5 text-xs"
              />
            </div>
          )}
        </form>

        {customReminders.length === 0 ? (
          <p className="text-xs text-[#6E5D66] dark:text-[#A598A0]">
            No custom timed reminders yet. Create one above to get notified at your chosen time.
          </p>
        ) : (
          <div className="divide-y divide-[#EFEAE4] dark:divide-[#2D2630] border-t border-[#EFEAE4] dark:border-[#2D2630]">
            {customReminders.map((rem) => (
              <div key={rem.id} className="py-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono-num text-sm font-semibold text-[#9D4E63] dark:text-[#E097AA]">
                      {rem.reminderTime}
                    </span>
                    <span className="text-sm font-medium truncate">{rem.title}</span>
                    <span className="text-[11px] text-[#6E5D66] dark:text-[#A598A0]">
                      ({rem.frequency === 'once' ? `Once on ${rem.scheduledDate || 'today'}` : 'Daily'})
                    </span>
                  </div>
                  {rem.message && (
                    <p className="text-xs text-[#6E5D66] dark:text-[#A598A0] mt-0.5 truncate">
                      {rem.message}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleToggleCustomReminder(rem)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium cursor-pointer border ${
                      rem.enabled
                        ? 'border-[#C9D8CD] bg-[#F2F7F4] text-[#365341] dark:border-[#395343] dark:bg-[#1D2A22] dark:text-[#A9D1B8]'
                        : 'border-[#DFD6CE] bg-[#FAF8F6] text-[#6E5D66] dark:border-[#3C333F] dark:bg-[#141115]'
                    }`}
                  >
                    {rem.enabled ? 'Active' : 'Paused'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteCustomReminder(rem.id)}
                    className="p-1.5 rounded-lg text-[#8C2D42] dark:text-[#F0A8B8] hover:bg-[#FDF2F4] dark:hover:bg-[#381C24] cursor-pointer"
                    aria-label={`Delete reminder ${rem.title}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Password Change */}
      <form
        onSubmit={handleChangePassword}
        className="rounded-2xl border border-[#E6DFD7] dark:border-[#352E38] bg-[#FFFFFF] dark:bg-[#1D191F] p-6 sm:p-8 space-y-4"
      >
        <h2 className="font-display text-xl font-semibold">Change Password</h2>
        {passwordErr && (
          <div className="p-3 rounded-xl border border-[#D89AA7] bg-[#FDF2F4] dark:bg-[#381C24] text-sm text-[#8C2D42] dark:text-[#F4B4C2]">
            {passwordErr}
          </div>
        )}
        {passwordMsg && (
          <div className="p-3 rounded-xl border border-[#C9D8CD] bg-[#F2F7F4] dark:bg-[#1D2A22] text-sm text-[#365341] dark:text-[#A9D1B8]">
            {passwordMsg}
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <input
            type="password"
            required
            placeholder="Current password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="rounded-xl border border-[#DFD6CE] dark:border-[#3C333F] bg-[#FAF8F6] dark:bg-[#141115] px-3.5 py-2.5 text-sm"
          />
          <input
            type="password"
            required
            minLength={8}
            placeholder="New password (8+ chars)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="rounded-xl border border-[#DFD6CE] dark:border-[#3C333F] bg-[#FAF8F6] dark:bg-[#141115] px-3.5 py-2.5 text-sm"
          />
          <input
            type="password"
            required
            minLength={8}
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="rounded-xl border border-[#DFD6CE] dark:border-[#3C333F] bg-[#FAF8F6] dark:bg-[#141115] px-3.5 py-2.5 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={savingPassword}
          className="px-5 py-2.5 rounded-xl border border-[#DFD6CE] dark:border-[#3C333F] text-sm font-medium hover:bg-[#F5F0EC] dark:hover:bg-[#262129] cursor-pointer"
        >
          {savingPassword ? 'Updating...' : 'Update Password'}
        </button>
      </form>

      {/* Data Export & Account Deletion */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="rounded-2xl border border-[#E6DFD7] dark:border-[#352E38] bg-[#FFFFFF] dark:bg-[#1D191F] p-6 space-y-4">
          <h2 className="font-display text-xl font-semibold">Export Personal Data</h2>
          <p className="text-xs text-[#594B53] dark:text-[#BFB2BA] leading-relaxed">
            Download a portable copy of your profile, cycle settings, periods, symptoms, moods, and daily wellness logs.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() =>
                downloadFileFromApi('/api/profile/export?format=json', 'bloom-personal-export.json')
              }
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#DFD6CE] dark:border-[#3C333F] text-xs font-medium hover:bg-[#F5F0EC] dark:hover:bg-[#262129] cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" /> Download JSON
            </button>
            <button
              type="button"
              onClick={() =>
                downloadFileFromApi('/api/profile/export?format=csv', 'bloom-personal-export.csv')
              }
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#DFD6CE] dark:border-[#3C333F] text-xs font-medium hover:bg-[#F5F0EC] dark:hover:bg-[#262129] cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" /> Download CSV
            </button>
          </div>
        </section>

        <form
          onSubmit={handleDeleteAccount}
          className="rounded-2xl border border-[#E8C5CD] dark:border-[#5D303C] bg-[#FFFFFF] dark:bg-[#1D191F] p-6 space-y-3"
        >
          <h2 className="font-display text-xl font-semibold text-[#8C2D42] dark:text-[#F0A8B8]">
            Delete Account
          </h2>
          <p className="text-xs text-[#594B53] dark:text-[#BFB2BA] leading-relaxed">
            Retention Policy: Account deletion immediately and permanently erases your user account, cycle settings, periods, symptoms, moods, wellness logs, and notifications.
          </p>
          {deleteErr && (
            <div className="p-2.5 rounded-xl bg-[#FDF2F4] dark:bg-[#381C24] text-xs text-[#8C2D42] dark:text-[#F4B4C2]">
              {deleteErr}
            </div>
          )}
          <input
            type="password"
            required
            placeholder="Enter password to confirm"
            value={deletePassword}
            onChange={(e) => setDeletePassword(e.target.value)}
            className="w-full rounded-xl border border-[#DFD6CE] dark:border-[#3C333F] bg-[#FAF8F6] dark:bg-[#141115] px-3.5 py-2 text-xs"
          />
          <input
            type="text"
            required
            placeholder="Type DELETE to confirm"
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            className="w-full rounded-xl border border-[#DFD6CE] dark:border-[#3C333F] bg-[#FAF8F6] dark:bg-[#141115] px-3.5 py-2 text-xs"
          />
          <button
            type="submit"
            disabled={deleting}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#B84359] hover:bg-[#9B3347] text-white text-xs font-medium cursor-pointer disabled:opacity-60"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {deleting ? 'Deleting...' : 'Permanently Delete Account'}
          </button>
        </form>
      </div>
    </div>
  );
}
