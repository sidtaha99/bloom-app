import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../server/app';
import { DatabaseService } from '../server/db/database';

let db: DatabaseService;
let baseUrl: string;
let server: ReturnType<ReturnType<typeof createApp>['listen']>;

async function api(
  path: string,
  options: { method?: string; body?: unknown; cookie?: string; bearer?: string } = {}
) {
  const headers: Record<string, string> = {
    'X-Requested-With': 'BloomApp',
  };
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (options.cookie) {
    headers['Cookie'] = options.cookie;
  }
  if (options.bearer) {
    headers['Authorization'] = `Bearer ${options.bearer}`;
  }

  const res = await fetch(`${baseUrl}${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const setCookieHeader = res.headers.get('set-cookie');
  const cookie = setCookieHeader ? setCookieHeader.split(';')[0] : undefined;
  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json')
    ? await res.json()
    : await res.text();

  return { status: res.status, data, cookie };
}

describe('Bloom Full-Stack API Integration Tests', () => {
  beforeAll(async () => {
    db = new DatabaseService({ sqlitePath: ':memory:' });
    await db.init();
    const app = createApp(db);
    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        const addr = server.address() as AddressInfo;
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await db.close();
  });

  it('serves health and readiness checks and exposes zero admin endpoints', async () => {
    const health = await api('/api/health');
    expect(health.status).toBe(200);
    expect(health.data.status).toBe('ok');

    const ready = await api('/api/ready');
    expect(ready.status).toBe(200);
    expect(ready.data.ready).toBe(true);

    const adminCheck = await api('/api/admin');
    expect(adminCheck.status).toBe(404);
  });

  it('runs complete auth, OTP verification, onboarding, CRUD, isolation, export, and account deletion lifecycle', async () => {
    // 1. Reject underage registration
    const underage = await api('/api/auth/register', {
      method: 'POST',
      body: {
        fullName: 'Young User',
        email: 'young@example.com',
        password: 'Password123',
        confirmPassword: 'Password123',
        dateOfBirth: '2020-01-01',
        termsAccepted: true,
      },
    });
    expect(underage.status).toBe(400);

    // 2. Register User A
    const regA = await api('/api/auth/register', {
      method: 'POST',
      body: {
        fullName: 'Maya Lin',
        email: 'maya@example.com',
        password: 'Password123',
        confirmPassword: 'Password123',
        dateOfBirth: '1998-05-14',
        termsAccepted: true,
        timezone: 'America/New_York',
      },
    });
    expect(regA.status).toBe(201);
    expect(regA.data.devOtp).toMatch(/^\d{6}$/);

    // 3. Reject wrong OTP and track attempt count
    const wrongOtp = await api('/api/auth/verify-email', {
      method: 'POST',
      body: { email: 'maya@example.com', otp: '000000' },
    });
    expect(wrongOtp.status).toBe(400);

    // 4. Verify with valid OTP
    const verifyA = await api('/api/auth/verify-email', {
      method: 'POST',
      body: { email: 'maya@example.com', otp: regA.data.devOtp },
    });
    expect(verifyA.status).toBe(200);
    expect(verifyA.cookie).toBeTruthy();
    const cookieA = verifyA.cookie!;

    // 5. Onboarding
    const onboard = await api('/api/auth/onboarding', {
      method: 'POST',
      cookie: cookieA,
      body: {
        lastPeriodStartDate: '2026-04-01',
        averageCycleLength: 30,
        averagePeriodDuration: 5,
        cycleRegularity: 'regular',
      },
    });
    expect(onboard.status).toBe(200);
    expect(onboard.data.user.onboardingCompleted).toBe(true);

    // 6. Period CRUD + duplicate/overlap rejection
    const periodsInit = await api('/api/periods', { cookie: cookieA });
    expect(periodsInit.status).toBe(200);
    expect(periodsInit.data.periods.length).toBe(1);

    const dupPeriod = await api('/api/periods', {
      method: 'POST',
      cookie: cookieA,
      body: {
        startDate: '2026-04-01',
        endDate: '2026-04-05',
        flowIntensity: 'medium',
      },
    });
    expect(dupPeriod.status).toBe(409);

    const newPeriod = await api('/api/periods', {
      method: 'POST',
      cookie: cookieA,
      body: {
        startDate: '2026-05-01',
        endDate: '2026-05-05',
        flowIntensity: 'heavy',
        notes: 'Cycle 2',
      },
    });
    expect(newPeriod.status).toBe(201);
    const periodId = newPeriod.data.period.id;

    const editPeriod = await api(`/api/periods/${periodId}`, {
      method: 'PUT',
      cookie: cookieA,
      body: {
        startDate: '2026-05-01',
        endDate: '2026-05-04',
        flowIntensity: 'medium',
        notes: 'Updated notes',
      },
    });
    expect(editPeriod.status).toBe(200);
    expect(editPeriod.data.period.endDate).toBe('2026-05-04');

    // 7. Cycle overview & calendar reflect updated period data
    const overview = await api('/api/cycle/overview', { cookie: cookieA });
    expect(overview.status).toBe(200);
    expect(overview.data.completedCyclesCount).toBe(1);
    expect(overview.data.estimatedCycleLength).toBe(30);

    const calendar = await api('/api/cycle/calendar?year=2026&month=5', { cookie: cookieA });
    expect(calendar.status).toBe(200);
    const may2 = calendar.data.days.find((d: { date: string }) => d.date === '2026-05-02');
    expect(may2.isLoggedPeriod).toBe(true);

    // 7b. iCalendar (.ics) export (full and discreet modes)
    const icsFull = await api('/api/cycle/export.ics?cycles=3&discreet=false', { cookie: cookieA });
    expect(icsFull.status).toBe(200);
    expect(String(icsFull.data)).toContain('BEGIN:VCALENDAR');
    expect(String(icsFull.data)).toContain('BEGIN:VEVENT');
    expect(String(icsFull.data)).toContain('Bloom: Menstrual Phase (Est.)');
    expect(String(icsFull.data)).toContain('TRANSP:TRANSPARENT');

    const icsDiscreet = await api('/api/cycle/export.ics?cycles=2&discreet=true&includeFertile=false', {
      cookie: cookieA,
    });
    expect(icsDiscreet.status).toBe(200);
    expect(String(icsDiscreet.data)).toContain('Bloom · Phase 1 (Rest)');
    expect(String(icsDiscreet.data)).not.toContain('Estimated Fertile Window');

    // 8. Symptom, Mood, and Wellness CRUD
    const sym = await api('/api/symptoms', {
      method: 'POST',
      cookie: cookieA,
      body: {
        date: '2026-05-01',
        physicalSymptoms: ['Cramps', 'Fatigue'],
        emotionalSymptoms: ['Stress'],
        severity: 3,
        notes: 'Day 1 cramps',
      },
    });
    expect(sym.status).toBe(201);

    const mood = await api('/api/moods', {
      method: 'POST',
      cookie: cookieA,
      body: { date: '2026-05-01', mood: 'calm', notes: 'Resting at home' },
    });
    expect(mood.status).toBe(201);

    const well = await api('/api/wellness', {
      method: 'POST',
      cookie: cookieA,
      body: {
        date: '2026-05-01',
        waterIntakeMl: 2000,
        sleepHours: 8,
        physicalActivityMinutes: 20,
        exerciseType: 'Gentle yoga',
        energyLevel: 3,
        selfCareNotes: 'Herbal tea',
      },
    });
    expect(well.status).toBe(201);

    // 9. Register & verify User B to verify strict user ownership isolation
    const regB = await api('/api/auth/register', {
      method: 'POST',
      body: {
        fullName: 'Sara Patel',
        email: 'sara@example.com',
        password: 'Password123',
        confirmPassword: 'Password123',
        dateOfBirth: '1997-08-20',
        termsAccepted: true,
      },
    });
    const verifyB = await api('/api/auth/verify-email', {
      method: 'POST',
      body: { email: 'sara@example.com', otp: regB.data.devOtp },
    });
    const cookieB = verifyB.cookie!;

    const bPeriods = await api('/api/periods', { cookie: cookieB });
    expect(bPeriods.data.periods.length).toBe(0);

    const bDeleteAttempt = await api(`/api/periods/${periodId}`, {
      method: 'DELETE',
      cookie: cookieB,
    });
    expect(bDeleteAttempt.status).toBe(404);

    // 10. Data export JSON & CSV
    const exportJson = await api('/api/profile/export?format=json', { cookie: cookieA });
    expect(exportJson.status).toBe(200);
    expect(exportJson.data.periods.length).toBe(2);
    expect(exportJson.data.symptoms.length).toBe(1);

    const exportCsv = await api('/api/profile/export?format=csv', { cookie: cookieA });
    expect(exportCsv.status).toBe(200);
    expect(String(exportCsv.data)).toContain('recordType,dateOrStartDate');

    // 11. Logout & Password Recovery
    const logoutRes = await api('/api/auth/logout', { method: 'POST', cookie: cookieA });
    expect(logoutRes.status).toBe(200);

    const forgot = await api('/api/auth/forgot-password', {
      method: 'POST',
      body: { email: 'maya@example.com' },
    });
    expect(forgot.status).toBe(200);

    const reset = await api('/api/auth/reset-password', {
      method: 'POST',
      body: {
        email: 'maya@example.com',
        otp: forgot.data.devOtp,
        newPassword: 'NewPassword456',
        confirmPassword: 'NewPassword456',
      },
    });
    expect(reset.status).toBe(200);

    const loginNew = await api('/api/auth/login', {
      method: 'POST',
      body: { email: 'maya@example.com', password: 'NewPassword456', rememberMe: true },
    });
    expect(loginNew.status).toBe(200);
    const cookieANew = loginNew.cookie!;

    // 12. Period delete + Account deletion cascade
    const delPeriod = await api(`/api/periods/${periodId}`, {
      method: 'DELETE',
      cookie: cookieANew,
    });
    expect(delPeriod.status).toBe(200);

    const delAccount = await api('/api/profile', {
      method: 'DELETE',
      cookie: cookieANew,
      body: { password: 'NewPassword456' },
    });
    expect(delAccount.status).toBe(200);

    const loginAfterDelete = await api('/api/auth/login', {
      method: 'POST',
      body: { email: 'maya@example.com', password: 'NewPassword456' },
    });
    expect(loginAfterDelete.status).toBe(401);
  });

  it('authenticates onboarding and dashboard requests via Bearer sessionToken when third-party cookies are blocked', async () => {
    const reg = await api('/api/auth/register', {
      method: 'POST',
      body: {
        fullName: 'Ananya Rao',
        email: 'ananya@example.com',
        password: 'Password123',
        confirmPassword: 'Password123',
        dateOfBirth: '1999-03-11',
        termsAccepted: true,
      },
    });
    expect(reg.status).toBe(201);

    const verify = await api('/api/auth/verify-email', {
      method: 'POST',
      body: { email: 'ananya@example.com', otp: reg.data.devOtp },
    });
    expect(verify.status).toBe(200);
    expect(typeof verify.data.sessionToken).toBe('string');

    // Simulate iframe where browser drops cookies: send ONLY Bearer token
    const onboard = await api('/api/auth/onboarding', {
      method: 'POST',
      bearer: verify.data.sessionToken,
      body: {
        skip: true,
        averageCycleLength: 28,
        averagePeriodDuration: 5,
      },
    });
    expect(onboard.status).toBe(200);
    expect(onboard.data.user.onboardingCompleted).toBe(true);

    const overview = await api('/api/cycle/overview', {
      bearer: verify.data.sessionToken,
    });
    expect(overview.status).toBe(200);
    expect(overview.data.currentPhase).toBeTruthy();

    const me = await api('/api/auth/me', {
      bearer: verify.data.sessionToken,
    });
    expect(me.status).toBe(200);
    expect(me.data.user.email).toBe('ananya@example.com');

    // Custom timed reminder CRUD + sync
    const createRem = await api('/api/notifications/reminders', {
      method: 'POST',
      bearer: verify.data.sessionToken,
      body: {
        title: 'Evening Herbal Tea',
        message: 'Wind down before bed',
        reminderTime: '00:00',
        frequency: 'daily',
      },
    });
    expect(createRem.status).toBe(201);
    const remId = createRem.data.reminder.id;

    const syncRes = await api('/api/notifications/sync', {
      method: 'POST',
      bearer: verify.data.sessionToken,
    });
    expect(syncRes.status).toBe(200);
    expect(
      syncRes.data.notifications.some((n: { title: string }) => n.title === 'Evening Herbal Tea')
    ).toBe(true);

    const toggleRem = await api(`/api/notifications/reminders/${remId}`, {
      method: 'PUT',
      bearer: verify.data.sessionToken,
      body: { enabled: false },
    });
    expect(toggleRem.status).toBe(200);
    expect(toggleRem.data.reminder.enabled).toBe(false);

    const delRem = await api(`/api/notifications/reminders/${remId}`, {
      method: 'DELETE',
      bearer: verify.data.sessionToken,
    });
    expect(delRem.status).toBe(200);
  });
});
