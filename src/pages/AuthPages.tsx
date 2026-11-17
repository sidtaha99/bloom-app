import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import type { CycleSettingsDTO, UserProfile } from '../../shared/types';
import { BloomLogo } from '../components/BloomLogo';
import { useAuth } from '../context/AuthContext';
import { ApiError, apiFetch } from '../lib/api';

function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#FAF8F6] dark:bg-[#141115] text-[#2B2328] dark:text-[#F4EEF2] flex flex-col justify-center py-10 px-4 sm:px-6">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/" className="inline-flex justify-center">
          <BloomLogo size={32} />
        </Link>
        <h1 className="mt-5 font-display text-3xl font-semibold text-[#2B2328] dark:text-[#F4EEF2]">
          {title}
        </h1>
        <p className="mt-2 text-sm text-[#594B53] dark:text-[#BFB2BA]">{subtitle}</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="rounded-2xl border border-[#E6DFD7] dark:border-[#352E38] bg-[#FFFFFF] dark:bg-[#1D191F] p-6 sm:p-8 shadow-sm">
          {children}
        </div>
      </div>
    </div>
  );
}

export function RegisterPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      const data = await apiFetch<{
        email: string;
        message: string;
        devOtp?: string;
        emailDelivery?: { sent: boolean; reason?: string };
      }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          fullName,
          email,
          dateOfBirth,
          password,
          confirmPassword,
          termsAccepted,
          timezone,
        }),
      });
      navigate('/verify-email', {
        state: {
          email: data.email,
          message: data.message,
          devOtp: data.devOtp,
          emailSent: data.emailDelivery?.sent ?? false,
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to register');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Create your Bloom account"
      subtitle="Private, personal cycle & wellness tracking designed around your rhythm."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl border border-[#D89AA7] bg-[#FDF2F4] dark:bg-[#381C24] dark:border-[#6F3645] text-sm text-[#8C2D42] dark:text-[#F4B4C2]">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-[#594B53] dark:text-[#BFB2BA] mb-1.5">
            Full Name
          </label>
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Your full name"
            className="w-full rounded-xl border border-[#DFD6CE] dark:border-[#3C333F] bg-[#FAF8F6] dark:bg-[#141115] px-3.5 py-2.5 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[#594B53] dark:text-[#BFB2BA] mb-1.5">
            Email Address
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-xl border border-[#DFD6CE] dark:border-[#3C333F] bg-[#FAF8F6] dark:bg-[#141115] px-3.5 py-2.5 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[#594B53] dark:text-[#BFB2BA] mb-1.5">
            Date of Birth (13+ eligibility)
          </label>
          <input
            type="date"
            required
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
            className="w-full rounded-xl border border-[#DFD6CE] dark:border-[#3C333F] bg-[#FAF8F6] dark:bg-[#141115] px-3.5 py-2.5 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[#594B53] dark:text-[#BFB2BA] mb-1.5">
            Password (min 8 chars, letters & numbers)
          </label>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-[#DFD6CE] dark:border-[#3C333F] bg-[#FAF8F6] dark:bg-[#141115] px-3.5 py-2.5 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[#594B53] dark:text-[#BFB2BA] mb-1.5">
            Confirm Password
          </label>
          <input
            type="password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full rounded-xl border border-[#DFD6CE] dark:border-[#3C333F] bg-[#FAF8F6] dark:bg-[#141115] px-3.5 py-2.5 text-sm"
          />
        </div>

        <label className="flex items-start gap-2.5 text-xs text-[#594B53] dark:text-[#BFB2BA] cursor-pointer">
          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            className="mt-0.5 accent-[#9D4E63]"
          />
          <span>
            I accept the{' '}
            <Link to="/terms" className="text-[#9D4E63] dark:text-[#E097AA] underline">
              Terms of Service
            </Link>
            ,{' '}
            <Link to="/privacy" className="text-[#9D4E63] dark:text-[#E097AA] underline">
              Privacy Policy
            </Link>
            , and{' '}
            <Link to="/disclaimer" className="text-[#9D4E63] dark:text-[#E097AA] underline">
              Health Disclaimer
            </Link>
            .
          </span>
        </label>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-xl bg-[#9D4E63] hover:bg-[#843E51] text-white text-sm font-medium transition-colors disabled:opacity-60 cursor-pointer"
        >
          {loading ? 'Creating account...' : 'Create Account'}
        </button>
      </form>

      <p className="mt-5 text-center text-xs text-[#6E5D66] dark:text-[#A598A0]">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-[#9D4E63] dark:text-[#E097AA] hover:underline">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}

export function VerifyEmailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setSessionData } = useAuth();
  const [searchParams] = useSearchParams();
  const navState = (location.state || {}) as {
    email?: string;
    message?: string;
    devOtp?: string;
    emailSent?: boolean;
  };

  const [email, setEmail] = useState(navState.email || searchParams.get('email') || '');
  const [otp, setOtp] = useState('');
  const [infoMessage, setInfoMessage] = useState(navState.message || '');
  const [devOtp, setDevOtp] = useState(navState.devOtp || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await apiFetch<{
        user: UserProfile;
        cycleSettings: CycleSettingsDTO;
        sessionToken?: string;
      }>('/api/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ email, otp }),
      });
      setSessionData(data.user, data.cycleSettings, data.sessionToken);
      navigate(data.user.onboardingCompleted ? '/dashboard' : '/onboarding');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setInfoMessage('');
    try {
      const data = await apiFetch<{ message: string; devOtp?: string }>('/api/auth/resend-otp', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setInfoMessage(data.message);
      if (data.devOtp) setDevOtp(data.devOtp);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to resend code');
    }
  };

  return (
    <AuthShell
      title="Verify your email"
      subtitle="Enter the 6-digit verification code to activate your personal Bloom space."
    >
      <form onSubmit={handleVerify} className="space-y-4">
        {infoMessage && (
          <div className="p-3 rounded-xl border border-[#C9D8CD] bg-[#F2F7F4] dark:bg-[#1D2A22] dark:border-[#395343] text-xs text-[#365341] dark:text-[#A9D1B8] leading-relaxed">
            {infoMessage}
          </div>
        )}

        {devOtp && (
          <div className="p-3 rounded-xl border border-[#DFD1D6] bg-[#FAF3F5] dark:bg-[#2A1E24] dark:border-[#4F3640] text-xs text-[#594B53] dark:text-[#E8CDD4]">
            Preview OTP (Brevo email not configured):{' '}
            <span className="font-mono-num font-semibold text-sm text-[#2B2328] dark:text-white">
              {devOtp}
            </span>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-xl border border-[#D89AA7] bg-[#FDF2F4] dark:bg-[#381C24] dark:border-[#6F3645] text-sm text-[#8C2D42] dark:text-[#F4B4C2]">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-[#594B53] dark:text-[#BFB2BA] mb-1.5">
            Email Address
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-[#DFD6CE] dark:border-[#3C333F] bg-[#FAF8F6] dark:bg-[#141115] px-3.5 py-2.5 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[#594B53] dark:text-[#BFB2BA] mb-1.5">
            6-Digit Verification Code
          </label>
          <input
            type="text"
            required
            maxLength={6}
            inputMode="numeric"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
            placeholder="000000"
            className="w-full rounded-xl border border-[#DFD6CE] dark:border-[#3C333F] bg-[#FAF8F6] dark:bg-[#141115] px-3.5 py-2.5 text-base tracking-[0.35em] font-mono-num text-center"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-xl bg-[#9D4E63] hover:bg-[#843E51] text-white text-sm font-medium cursor-pointer disabled:opacity-60"
        >
          {loading ? 'Verifying...' : 'Verify Email'}
        </button>

        <button
          type="button"
          onClick={handleResend}
          className="w-full py-2 text-xs font-medium text-[#9D4E63] dark:text-[#E097AA] hover:underline cursor-pointer"
        >
          Resend verification code
        </button>
      </form>
    </AuthShell>
  );
}

export function LoginPage() {
  const navigate = useNavigate();
  const { setSessionData } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await apiFetch<{
        user: UserProfile;
        cycleSettings: CycleSettingsDTO;
        sessionToken?: string;
      }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password, rememberMe }),
      });
      setSessionData(data.user, data.cycleSettings, data.sessionToken);
      navigate(data.user.onboardingCompleted ? '/dashboard' : '/onboarding');
    } catch (err) {
      if (err instanceof ApiError && err.data?.requiresVerification) {
        navigate(`/verify-email?email=${encodeURIComponent(email)}`);
        return;
      }
      setError(err instanceof Error ? err.message : 'Unable to sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to view your cycle calendar, logs, and daily wellness."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl border border-[#D89AA7] bg-[#FDF2F4] dark:bg-[#381C24] dark:border-[#6F3645] text-sm text-[#8C2D42] dark:text-[#F4B4C2]">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-[#594B53] dark:text-[#BFB2BA] mb-1.5">
            Email Address
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-xl border border-[#DFD6CE] dark:border-[#3C333F] bg-[#FAF8F6] dark:bg-[#141115] px-3.5 py-2.5 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[#594B53] dark:text-[#BFB2BA] mb-1.5">
            Password
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-[#DFD6CE] dark:border-[#3C333F] bg-[#FAF8F6] dark:bg-[#141115] px-3.5 py-2.5 text-sm"
          />
        </div>

        <div className="flex items-center justify-between text-xs">
          <label className="flex items-center gap-2 text-[#594B53] dark:text-[#BFB2BA] cursor-pointer">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="accent-[#9D4E63]"
            />
            Remember session (30 days)
          </label>
          <Link
            to="/forgot-password"
            className="font-medium text-[#9D4E63] dark:text-[#E097AA] hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-xl bg-[#9D4E63] hover:bg-[#843E51] text-white text-sm font-medium cursor-pointer disabled:opacity-60"
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <p className="mt-5 text-center text-xs text-[#6E5D66] dark:text-[#A598A0]">
        New to Bloom?{' '}
        <Link to="/register" className="font-medium text-[#9D4E63] dark:text-[#E097AA] hover:underline">
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [devOtp, setDevOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRequestOtp = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await apiFetch<{ message: string; devOtp?: string }>(
        '/api/auth/forgot-password',
        {
          method: 'POST',
          body: JSON.stringify({ email }),
        }
      );
      setInfoMessage(data.message);
      if (data.devOtp) setDevOtp(data.devOtp);
      setStep('reset');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to request reset code');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await apiFetch('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email, otp, newPassword, confirmPassword }),
      });
      navigate('/login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Reset your password"
      subtitle={
        step === 'request'
          ? 'Enter your registered email to receive a 6-digit password reset code.'
          : 'Enter the 6-digit code and choose a new password.'
      }
    >
      {step === 'request' ? (
        <form onSubmit={handleRequestOtp} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl border border-[#D89AA7] bg-[#FDF2F4] dark:bg-[#381C24] text-sm text-[#8C2D42] dark:text-[#F4B4C2]">
              {error}
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-[#594B53] dark:text-[#BFB2BA] mb-1.5">
              Registered Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-[#DFD6CE] dark:border-[#3C333F] bg-[#FAF8F6] dark:bg-[#141115] px-3.5 py-2.5 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-[#9D4E63] hover:bg-[#843E51] text-white text-sm font-medium cursor-pointer disabled:opacity-60"
          >
            {loading ? 'Sending code...' : 'Send Reset Code'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleResetPassword} className="space-y-4">
          {infoMessage && (
            <div className="p-3 rounded-xl border border-[#C9D8CD] bg-[#F2F7F4] dark:bg-[#1D2A22] text-xs text-[#365341] dark:text-[#A9D1B8]">
              {infoMessage}
            </div>
          )}
          {devOtp && (
            <div className="p-3 rounded-xl border border-[#DFD1D6] bg-[#FAF3F5] dark:bg-[#2A1E24] text-xs">
              Preview Reset OTP (Brevo email not configured):{' '}
              <span className="font-mono-num font-semibold text-sm">{devOtp}</span>
            </div>
          )}
          {error && (
            <div className="p-3 rounded-xl border border-[#D89AA7] bg-[#FDF2F4] dark:bg-[#381C24] text-sm text-[#8C2D42] dark:text-[#F4B4C2]">
              {error}
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-[#594B53] dark:text-[#BFB2BA] mb-1.5">
              6-Digit Reset Code
            </label>
            <input
              type="text"
              required
              maxLength={6}
              inputMode="numeric"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              className="w-full rounded-xl border border-[#DFD6CE] dark:border-[#3C333F] bg-[#FAF8F6] dark:bg-[#141115] px-3.5 py-2.5 text-base font-mono-num tracking-[0.35em] text-center"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#594B53] dark:text-[#BFB2BA] mb-1.5">
              New Password
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-xl border border-[#DFD6CE] dark:border-[#3C333F] bg-[#FAF8F6] dark:bg-[#141115] px-3.5 py-2.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#594B53] dark:text-[#BFB2BA] mb-1.5">
              Confirm New Password
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-xl border border-[#DFD6CE] dark:border-[#3C333F] bg-[#FAF8F6] dark:bg-[#141115] px-3.5 py-2.5 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-[#9D4E63] hover:bg-[#843E51] text-white text-sm font-medium cursor-pointer disabled:opacity-60"
          >
            {loading ? 'Updating password...' : 'Reset Password'}
          </button>
        </form>
      )}

      <p className="mt-5 text-center text-xs text-[#6E5D66] dark:text-[#A598A0]">
        Remembered your password?{' '}
        <Link to="/login" className="font-medium text-[#9D4E63] dark:text-[#E097AA] hover:underline">
          Back to sign in
        </Link>
      </p>
    </AuthShell>
  );
}
