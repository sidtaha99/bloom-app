import {
  Activity,
  BarChart3,
  Bell,
  BellRing,
  CalendarDays,
  Check,
  Clock,
  Droplets,
  HeartHandshake,
  Home,
  Leaf,
  LogOut,
  Menu,
  Moon,
  Plus,
  Settings,
  Smile,
  Sparkles,
  Sun,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import type { AppNotification, CustomReminder } from '../../shared/types';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { apiFetch } from '../lib/api';
import {
  dispatchBackgroundNotification,
  registerNotificationServiceWorker,
  requestNotificationPermission,
} from '../lib/notifications';
import { BloomLogo } from './BloomLogo';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: Home },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/periods', label: 'Period Tracker', icon: Droplets },
  { to: '/symptoms', label: 'Symptoms', icon: Activity },
  { to: '/mood', label: 'Mood', icon: Smile },
  { to: '/wellness', label: 'Daily Wellness', icon: HeartHandshake },
  { to: '/nutrition', label: 'Nutrition & Phases', icon: Leaf },
  { to: '/insights', label: 'Insights & History', icon: BarChart3 },
  { to: '/play', label: 'Relax & Play', icon: Sparkles },
  { to: '/settings', label: 'Profile & Settings', icon: Settings },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const { user, cycleSettings, logout, setSessionData } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [reminders, setReminders] = useState<CustomReminder[]>([]);

  // Quick add timed reminder state inside notification popover
  const [showQuickReminder, setShowQuickReminder] = useState(false);
  const [quickTitle, setQuickTitle] = useState('');
  const [quickTime, setQuickTime] = useState('20:00');
  const [quickFreq, setQuickFreq] = useState<'daily' | 'once'>('daily');
  const [quickDate, setQuickDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [savingQuick, setSavingQuick] = useState(false);
  const [notifFeedback, setNotifFeedback] = useState('');

  useEffect(() => {
    setMobileMenuOpen(false);
    setNotifOpen(false);
  }, [location.pathname]);

  const dispatchUnreadBackgroundAlerts = useCallback(
    async (items: AppNotification[]) => {
      if (
        !cycleSettings?.notificationPreferences?.browserNotificationsEnabled ||
        typeof window === 'undefined' ||
        !('Notification' in window) ||
        window.Notification.permission !== 'granted'
      ) {
        return;
      }

      const seenKey = 'bloom_browser_notified_ids';
      let seenIds: string[] = [];
      try {
        const seenRaw = window.localStorage.getItem(seenKey);
        seenIds = seenRaw ? JSON.parse(seenRaw) : [];
      } catch {
        seenIds = [];
      }

      const newUnread = items.filter((n) => !n.isRead && !seenIds.includes(n.id));
      if (newUnread.length > 0) {
        const latest = newUnread[0];
        await dispatchBackgroundNotification(latest.title, latest.message, {
          tag: `bloom-${latest.id}`,
          url: '/dashboard',
        });
        try {
          const updatedIds = [...seenIds, ...newUnread.map((n) => n.id)].slice(-60);
          window.localStorage.setItem(seenKey, JSON.stringify(updatedIds));
        } catch {
          // ignore storage errors
        }
      }
    },
    [cycleSettings?.notificationPreferences?.browserNotificationsEnabled]
  );

  const loadNotifications = useCallback(async () => {
    try {
      const data = await apiFetch<{
        notifications: AppNotification[];
        reminders?: CustomReminder[];
      }>('/api/notifications');
      setNotifications(data.notifications);
      if (data.reminders) setReminders(data.reminders);
      await dispatchUnreadBackgroundAlerts(data.notifications);
    } catch {
      // ignore background notification fetch error
    }
  }, [dispatchUnreadBackgroundAlerts]);

  // Register Service Worker & poll timed reminders every 30s while active
  useEffect(() => {
    if (!user) return;
    registerNotificationServiceWorker();
    loadNotifications();

    const intervalId = window.setInterval(async () => {
      try {
        const data = await apiFetch<{
          notifications: AppNotification[];
          newlyTriggered: AppNotification[];
        }>('/api/notifications/sync', { method: 'POST' });
        setNotifications(data.notifications);
        if (data.newlyTriggered && data.newlyTriggered.length > 0) {
          await dispatchUnreadBackgroundAlerts(data.newlyTriggered);
        }
      } catch {
        // ignore background sync tick failure
      }
    }, 30000);

    return () => window.clearInterval(intervalId);
  }, [user, location.pathname, loadNotifications, dispatchUnreadBackgroundAlerts]);

  const handleThemeToggle = async () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    toggleTheme();
    if (user) {
      try {
        const res = await apiFetch<{ user: typeof user; cycleSettings: typeof cycleSettings }>(
          '/api/profile',
          {
            method: 'PUT',
            body: JSON.stringify({ themePreference: nextTheme }),
          }
        );
        setSessionData(res.user, res.cycleSettings);
      } catch {
        // non-blocking preference sync
      }
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkRead = async (id: string) => {
    try {
      await apiFetch(`/api/notifications/${id}/read`, { method: 'PUT' });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch {
      // ignore
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await apiFetch('/api/notifications/read-all', { method: 'PUT' });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {
      // ignore
    }
  };

  const handleQuickAddReminder = async (e: FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;
    setSavingQuick(true);
    setNotifFeedback('');
    try {
      const res = await apiFetch<{ reminder: CustomReminder }>('/api/notifications/reminders', {
        method: 'POST',
        body: JSON.stringify({
          title: quickTitle.trim(),
          reminderTime: quickTime,
          frequency: quickFreq,
          scheduledDate: quickFreq === 'once' ? quickDate : null,
        }),
      });
      setReminders((prev) => [...prev, res.reminder]);
      setQuickTitle('');
      setShowQuickReminder(false);
      setNotifFeedback(`Reminder scheduled for ${res.reminder.reminderTime}.`);
      await loadNotifications();
    } catch (err) {
      setNotifFeedback(err instanceof Error ? err.message : 'Unable to save reminder');
    } finally {
      setSavingQuick(false);
    }
  };

  const handleSendTestBackgroundAlert = async () => {
    setNotifFeedback('');
    const permission = await requestNotificationPermission();
    if (permission !== 'granted') {
      setNotifFeedback('Allow browser notification permission to receive background alerts.');
      return;
    }
    const ok = await dispatchBackgroundNotification(
      'Bloom Wellness Check-In',
      'Background notifications are active! Your timed reminders will notify you here.',
      { tag: `bloom-test-${Date.now()}`, url: '/dashboard' }
    );
    setNotifFeedback(
      ok
        ? 'Background notification dispatched.'
        : 'Could not dispatch browser notification in this preview frame.'
    );
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const currentNav = NAV_ITEMS.find((item) => location.pathname.startsWith(item.to));

  return (
    <div className="min-h-screen flex bg-[#FAF8F6] text-[#2B2328] dark:bg-[#141115] dark:text-[#F4EEF2]">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-[264px] lg:flex-col lg:fixed lg:inset-y-0 border-r border-[#E6DFD7] dark:border-[#352E38] bg-gradient-to-b from-[#FFFFFF] via-[#FFFFFF] to-[#FAF5F7] dark:from-[#1B171D] dark:via-[#1B171D] dark:to-[#1F181E]">
        <div className="h-16 px-6 flex items-center border-b border-[#E6DFD7] dark:border-[#352E38]">
          <Link to="/dashboard" aria-label="Bloom Dashboard">
            <BloomLogo size={28} />
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-1" aria-label="Main navigation">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-gradient-to-r from-[#F6E4EA] to-[#F2E9F5] text-[#843E51] shadow-xs dark:from-[#3D232E] dark:to-[#302338] dark:text-[#F3B9C8]'
                      : 'text-[#594B53] hover:bg-[#F5F0EC] hover:text-[#2B2328] dark:text-[#BFB2BA] dark:hover:bg-[#262129] dark:hover:text-[#F4EEF2]'
                  }`
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#E6DFD7] dark:border-[#352E38] space-y-3">
          <div className="px-3 py-2.5 rounded-xl bg-[#FAF6F8] dark:bg-[#221C24] border border-[#EFE6EA] dark:border-[#322936]">
            <p className="text-sm font-semibold text-[#2B2328] dark:text-[#F4EEF2] truncate">
              {user?.fullName}
            </p>
            <p className="text-[11px] text-[#6E5D66] dark:text-[#A598A0] truncate">{user?.email}</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-sm font-medium text-[#594B53] hover:bg-[#F5F0EC] hover:text-[#2B2328] dark:text-[#BFB2BA] dark:hover:bg-[#262129] dark:hover:text-[#F4EEF2] transition-colors cursor-pointer"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-[1px]"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative w-72 max-w-[85vw] bg-[#FFFFFF] dark:bg-[#1B171D] h-full flex flex-col border-r border-[#E6DFD7] dark:border-[#352E38]">
            <div className="h-16 px-5 flex items-center justify-between border-b border-[#E6DFD7] dark:border-[#352E38]">
              <BloomLogo size={26} />
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-lg text-[#594B53] dark:text-[#BFB2BA] hover:bg-[#F5F0EC] dark:hover:bg-[#262129]"
                aria-label="Close navigation menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-[#F5E7EB] text-[#843E51] dark:bg-[#3A232C] dark:text-[#F0B4C2]'
                          : 'text-[#594B53] hover:bg-[#F5F0EC] dark:text-[#BFB2BA] dark:hover:bg-[#262129]'
                      }`
                    }
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>
            <div className="p-4 border-t border-[#E6DFD7] dark:border-[#352E38]">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-medium text-[#594B53] hover:bg-[#F5F0EC] dark:text-[#BFB2BA] dark:hover:bg-[#262129]"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign out</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-[264px] flex flex-col min-w-0">
        <header className="sticky top-0 z-30 h-16 bg-[#FAF8F6]/88 dark:bg-[#141115]/88 backdrop-blur-md border-b border-[#E6DFD7] dark:border-[#352E38] px-4 sm:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 -ml-2 rounded-lg text-[#594B53] dark:text-[#BFB2BA] hover:bg-[#EFEAE4] dark:hover:bg-[#262129]"
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2 text-sm text-[#6E5D66] dark:text-[#B5A7B0] truncate">
              <span className="hidden sm:inline">Bloom</span>
              <span className="hidden sm:inline" aria-hidden="true">/</span>
              <span className="font-semibold text-[#2B2328] dark:text-[#F4EEF2] truncate">
                {currentNav?.label || 'Wellness'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              to="/play"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#E6DFD7] dark:border-[#352E38] bg-[#FFFFFF] dark:bg-[#1D191F] text-xs font-medium text-[#594B53] dark:text-[#D5C9D0] hover:border-[#9D4E63] hover:text-[#9D4E63] dark:hover:text-[#E097AA] transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5 text-[#9D4E63] dark:text-[#E097AA]" />
              Relax & Play
            </Link>

            <button
              type="button"
              onClick={handleThemeToggle}
              className="p-2.5 rounded-xl border border-[#E6DFD7] dark:border-[#352E38] bg-[#FFFFFF] dark:bg-[#1D191F] text-[#594B53] dark:text-[#D5C9D0] hover:bg-[#F5F0EC] dark:hover:bg-[#262129] transition-colors cursor-pointer"
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setNotifOpen((o) => !o)}
                className="relative p-2.5 rounded-xl border border-[#E6DFD7] dark:border-[#352E38] bg-[#FFFFFF] dark:bg-[#1D191F] text-[#594B53] dark:text-[#D5C9D0] hover:bg-[#F5F0EC] dark:hover:bg-[#262129] transition-colors cursor-pointer"
                aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#9D4E63] text-white text-[11px] font-medium flex items-center justify-center tabular-nums">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-[#E6DFD7] dark:border-[#352E38] bg-[#FFFFFF] dark:bg-[#1D191F] shadow-xl overflow-hidden z-40">
                  <div className="px-4 py-3 border-b border-[#E6DFD7] dark:border-[#352E38] flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-[#2B2328] dark:text-[#F4EEF2]">
                      Reminders & Notices
                    </span>
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => setShowQuickReminder((v) => !v)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-[#5C7A67] dark:text-[#96B8A2] hover:underline cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add Time
                      </button>
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={handleMarkAllRead}
                          className="text-xs font-medium text-[#9D4E63] dark:text-[#E097AA] hover:underline cursor-pointer"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                  </div>

                  {showQuickReminder && (
                    <form
                      onSubmit={handleQuickAddReminder}
                      className="p-3.5 bg-[#FAF6F8] dark:bg-[#231C23] border-b border-[#E6DFD7] dark:border-[#352E38] space-y-2.5"
                    >
                      <input
                        type="text"
                        required
                        placeholder="Reminder title (e.g. Evening tea, Log mood)"
                        value={quickTitle}
                        onChange={(e) => setQuickTitle(e.target.value)}
                        className="w-full rounded-xl border border-[#DFD6CE] dark:border-[#3C333F] bg-[#FFFFFF] dark:bg-[#141115] px-3 py-2 text-xs"
                      />
                      <div className="flex items-center gap-2">
                        <input
                          type="time"
                          required
                          value={quickTime}
                          onChange={(e) => setQuickTime(e.target.value)}
                          className="rounded-xl border border-[#DFD6CE] dark:border-[#3C333F] bg-[#FFFFFF] dark:bg-[#141115] px-2.5 py-1.5 text-xs tabular-nums"
                        />
                        <select
                          value={quickFreq}
                          onChange={(e) => setQuickFreq(e.target.value as 'daily' | 'once')}
                          className="rounded-xl border border-[#DFD6CE] dark:border-[#3C333F] bg-[#FFFFFF] dark:bg-[#141115] px-2.5 py-1.5 text-xs"
                        >
                          <option value="daily">Every day</option>
                          <option value="once">One time</option>
                        </select>
                        {quickFreq === 'once' && (
                          <input
                            type="date"
                            value={quickDate}
                            onChange={(e) => setQuickDate(e.target.value)}
                            className="rounded-xl border border-[#DFD6CE] dark:border-[#3C333F] bg-[#FFFFFF] dark:bg-[#141115] px-2 py-1.5 text-xs"
                          />
                        )}
                        <button
                          type="submit"
                          disabled={savingQuick}
                          className="ml-auto px-3 py-1.5 rounded-xl bg-[#9D4E63] text-white text-xs font-medium cursor-pointer disabled:opacity-60"
                        >
                          {savingQuick ? '...' : 'Save'}
                        </button>
                      </div>
                    </form>
                  )}

                  {notifFeedback && (
                    <div className="px-4 py-2 bg-[#F2F7F4] dark:bg-[#1D2A22] border-b border-[#D7E3DC] dark:border-[#32493A] text-[11px] text-[#365341] dark:text-[#A9D1B8]">
                      {notifFeedback}
                    </div>
                  )}

                  <div className="max-h-72 overflow-y-auto divide-y divide-[#EFEAE4] dark:divide-[#2D2630]">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-sm text-[#6E5D66] dark:text-[#A598A0]">
                        No notifications right now. Add a timed reminder or adjust preferences in Settings.
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          className={`p-3.5 text-sm ${
                            n.isRead
                              ? 'opacity-70'
                              : 'bg-[#FAF5F7] dark:bg-[#261E24]'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-medium text-[#2B2328] dark:text-[#F4EEF2]">
                                {n.title}
                              </p>
                              <p className="text-xs text-[#594B53] dark:text-[#BFB2BA] mt-1 leading-relaxed">
                                {n.message}
                              </p>
                              <p className="text-[11px] text-[#83737C] dark:text-[#968991] mt-1.5 tabular-nums">
                                {n.scheduledForDate}
                              </p>
                            </div>
                            {!n.isRead && (
                              <button
                                type="button"
                                onClick={() => handleMarkRead(n.id)}
                                className="p-1.5 rounded-lg text-[#9D4E63] dark:text-[#E097AA] hover:bg-[#EFE4E8] dark:hover:bg-[#3A232C] shrink-0"
                                title="Mark as read"
                              >
                                <Check className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="px-4 py-2.5 bg-[#FAF8F6] dark:bg-[#18141A] border-t border-[#E6DFD7] dark:border-[#352E38] flex items-center justify-between gap-2 text-xs">
                    <button
                      type="button"
                      onClick={handleSendTestBackgroundAlert}
                      className="inline-flex items-center gap-1.5 font-medium text-[#594B53] dark:text-[#C5B8C0] hover:text-[#9D4E63] cursor-pointer"
                    >
                      <BellRing className="h-3.5 w-3.5" /> Test Alert
                    </button>
                    <Link
                      to="/settings"
                      className="inline-flex items-center gap-1 font-medium text-[#9D4E63] dark:text-[#E097AA] hover:underline"
                    >
                      <Clock className="h-3.5 w-3.5" />
                      {reminders.filter((r) => r.enabled).length} timed · Manage
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-8 max-w-6xl w-full mx-auto">{children}</main>

        <footer className="border-t border-[#E6DFD7] dark:border-[#352E38] px-4 sm:px-8 py-5 text-xs text-[#6E5D66] dark:text-[#A598A0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="max-w-2xl leading-relaxed">
            Bloom provides personal tracking and educational wellness information only. Estimates are not medical advice and must not be used for contraception or pregnancy prevention.
          </p>
          <div className="flex items-center gap-4 shrink-0 whitespace-nowrap">
            <Link to="/privacy" className="hover:underline">
              Privacy Policy
            </Link>
            <Link to="/terms" className="hover:underline">
              Terms
            </Link>
            <Link to="/disclaimer" className="hover:underline">
              Health Disclaimer
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
