import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { CycleSettingsDTO, UserProfile } from '../../shared/types';
import { apiFetch, clearAuthToken, setAuthToken } from '../lib/api';
import { useTheme } from './ThemeContext';

interface AuthState {
  user: UserProfile | null;
  cycleSettings: CycleSettingsDTO | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  refreshSession: () => Promise<void>;
  setSessionData: (
    user: UserProfile | null,
    cycleSettings: CycleSettingsDTO | null,
    sessionToken?: string
  ) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { setTheme } = useTheme();
  const [state, setState] = useState<AuthState>({
    user: null,
    cycleSettings: null,
    loading: true,
  });

  const refreshSession = useCallback(async () => {
    try {
      const data = await apiFetch<{
        user: UserProfile;
        cycleSettings: CycleSettingsDTO;
        sessionToken?: string;
      }>('/api/auth/me');
      if (data.sessionToken) {
        setAuthToken(data.sessionToken);
      }
      setState({ user: data.user, cycleSettings: data.cycleSettings, loading: false });
      if (data.user.themePreference) {
        setTheme(data.user.themePreference);
      }
    } catch {
      clearAuthToken();
      setState({ user: null, cycleSettings: null, loading: false });
    }
  }, [setTheme]);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  useEffect(() => {
    const handleUnauthorized = () => {
      clearAuthToken();
      setState({ user: null, cycleSettings: null, loading: false });
    };
    window.addEventListener('bloom:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('bloom:unauthorized', handleUnauthorized);
  }, []);

  const setSessionData = useCallback(
    (
      user: UserProfile | null,
      cycleSettings: CycleSettingsDTO | null,
      sessionToken?: string
    ) => {
      if (!user) {
        clearAuthToken();
      } else if (sessionToken) {
        setAuthToken(sessionToken);
      }
      setState({ user, cycleSettings, loading: false });
      if (user?.themePreference) {
        setTheme(user.themePreference);
      }
    },
    [setTheme]
  );

  const logout = useCallback(async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } finally {
      clearAuthToken();
      setState({ user: null, cycleSettings: null, loading: false });
    }
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, refreshSession, setSessionData, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
