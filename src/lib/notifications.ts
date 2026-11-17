let swRegistrationPromise: Promise<ServiceWorkerRegistration | null> | null = null;

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export async function registerNotificationServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }
  if (!swRegistrationPromise) {
    swRegistrationPromise = navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then(async (reg) => {
        try {
          await navigator.serviceWorker.ready;
        } catch {
          // ignore ready errors in restricted contexts
        }
        return reg;
      })
      .catch(() => null);
  }
  return swRegistrationPromise;
}

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!isNotificationSupported()) return 'unsupported';
  try {
    const permission = await window.Notification.requestPermission();
    if (permission === 'granted') {
      await registerNotificationServiceWorker();
    }
    return permission;
  } catch {
    return window.Notification.permission;
  }
}

export async function dispatchBackgroundNotification(
  title: string,
  body: string,
  options?: { tag?: string; url?: string; renotify?: boolean }
): Promise<boolean> {
  if (!isNotificationSupported() || window.Notification.permission !== 'granted') {
    return false;
  }

  try {
    const reg = await registerNotificationServiceWorker();
    if (reg && 'showNotification' in reg) {
      await reg.showNotification(title, {
        body,
        tag: options?.tag || 'bloom-reminder',
        data: { url: options?.url || '/dashboard' },
      });
      return true;
    }
  } catch {
    // Fallback to standard Notification constructor below
  }

  try {
    new window.Notification(title, {
      body,
      tag: options?.tag || 'bloom-reminder',
    });
    return true;
  } catch {
    return false;
  }
}
