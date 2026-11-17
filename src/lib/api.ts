export class ApiError extends Error {
  status: number;
  data: Record<string, unknown>;

  constructor(message: string, status: number, data: Record<string, unknown> = {}) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

const SESSION_TOKEN_KEY = 'bloom_session_token';
let memorySessionToken: string | null = null;

export function getAuthToken(): string | null {
  if (memorySessionToken) return memorySessionToken;
  try {
    const stored = window.sessionStorage.getItem(SESSION_TOKEN_KEY);
    if (stored) {
      memorySessionToken = stored;
      return stored;
    }
  } catch {
    // Ignore storage access restrictions inside sandboxed iframes
  }
  return null;
}

export function setAuthToken(token: string | null): void {
  memorySessionToken = token;
  try {
    if (token) {
      window.sessionStorage.setItem(SESSION_TOKEN_KEY, token);
    } else {
      window.sessionStorage.removeItem(SESSION_TOKEN_KEY);
    }
  } catch {
    // Ignore storage access restrictions
  }
}

export function clearAuthToken(): void {
  setAuthToken(null);
}

const PUBLIC_AUTH_PATHS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/verify-email',
  '/api/auth/resend-otp',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
];

function notifyIfSessionExpired(url: string, status: number): void {
  if (status !== 401) return;
  const isPublicAuthAttempt = PUBLIC_AUTH_PATHS.some((p) => url.startsWith(p));
  if (!isPublicAuthAttempt) {
    clearAuthToken();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('bloom:unauthorized'));
    }
  }
}

export async function apiFetch<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set('X-Requested-With', 'BloomApp');
  const token = getAuthToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  const contentType = response.headers.get('content-type') || '';
  if (!response.ok) {
    let errorMessage = `Request failed (${response.status})`;
    let errorData: Record<string, unknown> = {};
    if (contentType.includes('application/json')) {
      errorData = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      if (typeof errorData.error === 'string') {
        errorMessage = errorData.error;
      }
    }
    notifyIfSessionExpired(url, response.status);
    throw new ApiError(errorMessage, response.status, errorData);
  }

  if (contentType.includes('application/json')) {
    return (await response.json()) as T;
  }

  return (await response.text()) as unknown as T;
}

export async function downloadFileFromApi(url: string, fallbackFilename: string): Promise<void> {
  const headers = new Headers({
    'X-Requested-With': 'BloomApp',
  });
  const token = getAuthToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, {
    credentials: 'include',
    headers,
  });

  if (!response.ok) {
    const contentType = response.headers.get('content-type') || '';
    let errorMessage = `Download failed (${response.status})`;
    if (contentType.includes('application/json')) {
      const errData = (await response.json().catch(() => ({}))) as { error?: string };
      if (errData.error) errorMessage = errData.error;
    }
    notifyIfSessionExpired(url, response.status);
    throw new ApiError(errorMessage, response.status);
  }

  const blob = await response.blob();
  const disposition = response.headers.get('content-disposition') || '';
  const match = disposition.match(/filename="([^"]+)"/i);
  const filename = match?.[1] || fallbackFilename;

  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}
