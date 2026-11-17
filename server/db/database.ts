import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import mongoose from 'mongoose';
import { PHASE_NUTRITION_CONTENT } from '../../shared/nutritionData';
import type {
  AppNotification,
  CustomReminder,
  CycleRegularity,
  CycleSettingsDTO,
  FlowIntensity,
  MoodEntry,
  MoodType,
  NotificationPreferences,
  PeriodRecord,
  PhaseNutritionContent,
  SymptomEntry,
  TrackingPreferences,
  UserProfile,
  WellnessEntry,
} from '../../shared/types';
import {
  CustomReminderModel,
  CycleSettingsModel,
  EmailVerificationTokenModel,
  MoodEntryModel,
  NotificationModel,
  NutritionContentModel,
  PasswordResetTokenModel,
  PeriodModel,
  SymptomModel,
  UserModel,
  WellnessEntryModel,
} from '../models/mongoose';

export interface StoredUser extends UserProfile {
  passwordHash: string;
  consentAcceptedAt: string;
}

export interface StoredOtpToken {
  id: string;
  userId: string;
  email: string;
  otpHash: string;
  attempts: number;
  maxAttempts: number;
  expiresAt: string;
  usedAt: string | null;
}

const DEFAULT_TRACKING_PREFS: TrackingPreferences = {
  trackSymptoms: true,
  trackMood: true,
  trackWellness: true,
  dietPreference: 'all',
};

const DEFAULT_NOTIFICATION_PREFS: NotificationPreferences = {
  upcomingPeriodReminders: true,
  periodReminderDaysBefore: 2,
  periodReminderTime: '08:30',
  wellnessReminders: true,
  wellnessReminderTime: '09:00',
  hydrationReminders: false,
  hydrationReminderTime: '14:00',
  browserNotificationsEnabled: false,
};

export class DatabaseService {
  private mode: 'mongodb' | 'sqlite' = 'sqlite';
  private sqlite: DatabaseSync | null = null;
  private initialized = false;
  private sqlitePath: string;

  constructor(options?: { sqlitePath?: string; mongodbUri?: string }) {
    this.sqlitePath = options?.sqlitePath || path.resolve(process.cwd(), 'data', 'bloom.sqlite');
    if (options?.mongodbUri) {
      this.mode = 'mongodb';
    }
  }

  getMode(): 'mongodb' | 'sqlite' {
    return this.mode;
  }

  async init(mongodbUri?: string): Promise<void> {
    if (this.initialized) return;

    if (mongodbUri) {
      await mongoose.connect(mongodbUri, {
        serverSelectionTimeoutMS: 8000,
      });
      this.mode = 'mongodb';
      await this.seedNutritionMongo();
      this.initialized = true;
      return;
    }

    this.mode = 'sqlite';
    if (this.sqlitePath !== ':memory:') {
      fs.mkdirSync(path.dirname(this.sqlitePath), { recursive: true });
    }
    this.sqlite = new DatabaseSync(this.sqlitePath);
    this.sqlite.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
    this.createSqliteTables();
    this.seedNutritionSqlite();
    this.initialized = true;
  }

  async close(): Promise<void> {
    if (this.mode === 'mongodb') {
      await mongoose.disconnect();
    } else if (this.sqlite) {
      this.sqlite.close();
      this.sqlite = null;
    }
    this.initialized = false;
  }

  isHealthy(): boolean {
    if (!this.initialized) return false;
    if (this.mode === 'mongodb') {
      return mongoose.connection.readyState === 1;
    }
    return this.sqlite !== null;
  }

  private createSqliteTables(): void {
    const db = this.sqlite!;
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        fullName TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        passwordHash TEXT NOT NULL,
        dateOfBirth TEXT NOT NULL,
        isEmailVerified INTEGER NOT NULL DEFAULT 0,
        onboardingCompleted INTEGER NOT NULL DEFAULT 0,
        timezone TEXT NOT NULL DEFAULT 'UTC',
        themePreference TEXT NOT NULL DEFAULT 'light',
        privacyShowEstimatesNotice INTEGER NOT NULL DEFAULT 1,
        consentAcceptedAt TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS cycleSettings (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        lastPeriodStartDate TEXT,
        averageCycleLength INTEGER NOT NULL DEFAULT 29,
        averagePeriodDuration INTEGER NOT NULL DEFAULT 5,
        cycleRegularity TEXT NOT NULL DEFAULT 'unsure',
        usesDefaultEstimates INTEGER NOT NULL DEFAULT 1,
        trackingPreferencesJson TEXT NOT NULL,
        notificationPreferencesJson TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS periods (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        startDate TEXT NOT NULL,
        endDate TEXT NOT NULL,
        flowIntensity TEXT NOT NULL DEFAULT 'medium',
        notes TEXT NOT NULL DEFAULT '',
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_periods_user_start ON periods(userId, startDate DESC);

      CREATE TABLE IF NOT EXISTS symptoms (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        date TEXT NOT NULL,
        physicalSymptomsJson TEXT NOT NULL,
        emotionalSymptomsJson TEXT NOT NULL,
        otherSymptomText TEXT NOT NULL DEFAULT '',
        severity INTEGER NOT NULL,
        notes TEXT NOT NULL DEFAULT '',
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_symptoms_user_date ON symptoms(userId, date DESC);

      CREATE TABLE IF NOT EXISTS moodEntries (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        date TEXT NOT NULL,
        mood TEXT NOT NULL,
        notes TEXT NOT NULL DEFAULT '',
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_moods_user_date ON moodEntries(userId, date DESC);

      CREATE TABLE IF NOT EXISTS wellnessEntries (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        date TEXT NOT NULL,
        waterIntakeMl INTEGER NOT NULL DEFAULT 0,
        sleepHours REAL NOT NULL DEFAULT 7,
        physicalActivityMinutes INTEGER NOT NULL DEFAULT 0,
        exerciseType TEXT NOT NULL DEFAULT '',
        energyLevel INTEGER NOT NULL DEFAULT 3,
        selfCareNotes TEXT NOT NULL DEFAULT '',
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_wellness_user_date ON wellnessEntries(userId, date DESC);

      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        scheduledForDate TEXT NOT NULL,
        isRead INTEGER NOT NULL DEFAULT 0,
        createdAt TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_notifications_user_date ON notifications(userId, scheduledForDate DESC);

      CREATE TABLE IF NOT EXISTS nutritionContent (
        phase TEXT PRIMARY KEY,
        contentJson TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS emailVerificationTokens (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        email TEXT NOT NULL,
        otpHash TEXT NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        maxAttempts INTEGER NOT NULL DEFAULT 5,
        expiresAt TEXT NOT NULL,
        usedAt TEXT,
        createdAt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS passwordResetTokens (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        email TEXT NOT NULL,
        otpHash TEXT NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        maxAttempts INTEGER NOT NULL DEFAULT 5,
        expiresAt TEXT NOT NULL,
        usedAt TEXT,
        createdAt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS customReminders (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        message TEXT NOT NULL DEFAULT '',
        reminderTime TEXT NOT NULL,
        frequency TEXT NOT NULL DEFAULT 'daily',
        scheduledDate TEXT,
        enabled INTEGER NOT NULL DEFAULT 1,
        lastTriggeredDate TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_custom_reminders_user ON customReminders(userId, reminderTime ASC);
    `);
  }

  private async seedNutritionMongo(): Promise<void> {
    for (const item of PHASE_NUTRITION_CONTENT) {
      await NutritionContentModel.updateOne(
        { phase: item.phase },
        { $setOnInsert: item },
        { upsert: true }
      );
    }
  }

  private seedNutritionSqlite(): void {
    const db = this.sqlite!;
    const now = new Date().toISOString();
    const stmt = db.prepare(
      `INSERT OR IGNORE INTO nutritionContent (phase, contentJson, updatedAt) VALUES (?, ?, ?)`
    );
    for (const item of PHASE_NUTRITION_CONTENT) {
      stmt.run(item.phase, JSON.stringify(item), now);
    }
  }

  // ---------- USERS ----------
  async createUser(input: {
    fullName: string;
    email: string;
    passwordHash: string;
    dateOfBirth: string;
    timezone?: string;
  }): Promise<StoredUser> {
    const now = new Date().toISOString();
    const email = input.email.trim().toLowerCase();

    if (this.mode === 'mongodb') {
      const doc = await UserModel.create({
        fullName: input.fullName.trim(),
        email,
        passwordHash: input.passwordHash,
        dateOfBirth: input.dateOfBirth,
        isEmailVerified: false,
        onboardingCompleted: false,
        timezone: input.timezone || 'UTC',
        themePreference: 'light',
        privacyShowEstimatesNotice: true,
        consentAcceptedAt: new Date(),
      });
      await CycleSettingsModel.create({
        userId: doc._id,
        lastPeriodStartDate: null,
        averageCycleLength: 29,
        averagePeriodDuration: 5,
        cycleRegularity: 'unsure',
        usesDefaultEstimates: true,
        trackingPreferences: DEFAULT_TRACKING_PREFS,
        notificationPreferences: DEFAULT_NOTIFICATION_PREFS,
      });
      return this.mapMongoUser(doc);
    }

    const db = this.sqlite!;
    const id = crypto.randomUUID();
    db.prepare(
      `INSERT INTO users (id, fullName, email, passwordHash, dateOfBirth, isEmailVerified, onboardingCompleted, timezone, themePreference, privacyShowEstimatesNotice, consentAcceptedAt, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, 0, 0, ?, 'light', 1, ?, ?, ?)`
    ).run(
      id,
      input.fullName.trim(),
      email,
      input.passwordHash,
      input.dateOfBirth,
      input.timezone || 'UTC',
      now,
      now,
      now
    );

    const settingsId = crypto.randomUUID();
    db.prepare(
      `INSERT INTO cycleSettings (id, userId, lastPeriodStartDate, averageCycleLength, averagePeriodDuration, cycleRegularity, usesDefaultEstimates, trackingPreferencesJson, notificationPreferencesJson, updatedAt)
       VALUES (?, ?, NULL, 29, 5, 'unsure', 1, ?, ?, ?)`
    ).run(
      settingsId,
      id,
      JSON.stringify(DEFAULT_TRACKING_PREFS),
      JSON.stringify(DEFAULT_NOTIFICATION_PREFS),
      now
    );

    return (await this.findUserById(id))!;
  }

  async findUserByEmail(email: string): Promise<StoredUser | null> {
    const normalized = email.trim().toLowerCase();
    if (this.mode === 'mongodb') {
      const doc = await UserModel.findOne({ email: normalized });
      return doc ? this.mapMongoUser(doc) : null;
    }
    const row = this.sqlite!
      .prepare(`SELECT * FROM users WHERE email = ?`)
      .get(normalized) as Record<string, unknown> | undefined;
    return row ? this.mapSqliteUser(row) : null;
  }

  async findUserById(userId: string): Promise<StoredUser | null> {
    if (this.mode === 'mongodb') {
      if (!mongoose.isValidObjectId(userId)) return null;
      const doc = await UserModel.findById(userId);
      return doc ? this.mapMongoUser(doc) : null;
    }
    const row = this.sqlite!
      .prepare(`SELECT * FROM users WHERE id = ?`)
      .get(userId) as Record<string, unknown> | undefined;
    return row ? this.mapSqliteUser(row) : null;
  }

  async updateUser(
    userId: string,
    patch: Partial<{
      fullName: string;
      dateOfBirth: string;
      isEmailVerified: boolean;
      onboardingCompleted: boolean;
      timezone: string;
      themePreference: 'light' | 'dark';
      privacyShowEstimatesNotice: boolean;
      passwordHash: string;
    }>
  ): Promise<StoredUser | null> {
    const now = new Date().toISOString();
    if (this.mode === 'mongodb') {
      const doc = await UserModel.findByIdAndUpdate(
        userId,
        { $set: patch },
        { new: true }
      );
      return doc ? this.mapMongoUser(doc) : null;
    }

    const existing = await this.findUserById(userId);
    if (!existing) return null;

    this.sqlite!
      .prepare(
        `UPDATE users SET
          fullName = ?,
          dateOfBirth = ?,
          isEmailVerified = ?,
          onboardingCompleted = ?,
          timezone = ?,
          themePreference = ?,
          privacyShowEstimatesNotice = ?,
          passwordHash = ?,
          updatedAt = ?
         WHERE id = ?`
      )
      .run(
        patch.fullName ?? existing.fullName,
        patch.dateOfBirth ?? existing.dateOfBirth,
        (patch.isEmailVerified ?? existing.isEmailVerified) ? 1 : 0,
        (patch.onboardingCompleted ?? existing.onboardingCompleted) ? 1 : 0,
        patch.timezone ?? existing.timezone,
        patch.themePreference ?? existing.themePreference,
        (patch.privacyShowEstimatesNotice ?? existing.privacyShowEstimatesNotice) ? 1 : 0,
        patch.passwordHash ?? existing.passwordHash,
        now,
        userId
      );
    return this.findUserById(userId);
  }

  async deleteUserAndAllData(userId: string): Promise<boolean> {
    if (this.mode === 'mongodb') {
      const oid = new mongoose.Types.ObjectId(userId);
      await Promise.all([
        PeriodModel.deleteMany({ userId: oid }),
        CycleSettingsModel.deleteMany({ userId: oid }),
        SymptomModel.deleteMany({ userId: oid }),
        MoodEntryModel.deleteMany({ userId: oid }),
        WellnessEntryModel.deleteMany({ userId: oid }),
        NotificationModel.deleteMany({ userId: oid }),
        CustomReminderModel.deleteMany({ userId: oid }),
        EmailVerificationTokenModel.deleteMany({ userId: oid }),
        PasswordResetTokenModel.deleteMany({ userId: oid }),
      ]);
      const res = await UserModel.deleteOne({ _id: oid });
      return res.deletedCount > 0;
    }

    const res = this.sqlite!.prepare(`DELETE FROM users WHERE id = ?`).run(userId);
    return res.changes > 0;
  }

  // ---------- OTP TOKENS ----------
  async createOtpToken(
    kind: 'email_verification' | 'password_reset',
    input: {
      userId: string;
      email: string;
      otpHash: string;
      expiresAt: Date;
      maxAttempts?: number;
    }
  ): Promise<void> {
    const email = input.email.toLowerCase();
    const maxAttempts = input.maxAttempts ?? 5;

    if (this.mode === 'mongodb') {
      const Model =
        kind === 'email_verification' ? EmailVerificationTokenModel : PasswordResetTokenModel;
      await Model.deleteMany({ userId: new mongoose.Types.ObjectId(input.userId), usedAt: null });
      await Model.create({
        userId: new mongoose.Types.ObjectId(input.userId),
        email,
        otpHash: input.otpHash,
        attempts: 0,
        maxAttempts,
        expiresAt: input.expiresAt,
        usedAt: null,
      });
      return;
    }

    const table =
      kind === 'email_verification' ? 'emailVerificationTokens' : 'passwordResetTokens';
    this.sqlite!.prepare(`DELETE FROM ${table} WHERE userId = ? AND usedAt IS NULL`).run(input.userId);
    this.sqlite!
      .prepare(
        `INSERT INTO ${table} (id, userId, email, otpHash, attempts, maxAttempts, expiresAt, usedAt, createdAt)
         VALUES (?, ?, ?, ?, 0, ?, ?, NULL, ?)`
      )
      .run(
        crypto.randomUUID(),
        input.userId,
        email,
        input.otpHash,
        maxAttempts,
        input.expiresAt.toISOString(),
        new Date().toISOString()
      );
  }

  async getLatestActiveOtpToken(
    kind: 'email_verification' | 'password_reset',
    email: string
  ): Promise<StoredOtpToken | null> {
    const normalized = email.trim().toLowerCase();
    if (this.mode === 'mongodb') {
      const Model =
        kind === 'email_verification' ? EmailVerificationTokenModel : PasswordResetTokenModel;
      const doc = await Model.findOne({ email: normalized, usedAt: null }).sort({ createdAt: -1 });
      if (!doc) return null;
      return {
        id: doc._id.toString(),
        userId: doc.userId.toString(),
        email: doc.email,
        otpHash: doc.otpHash,
        attempts: doc.attempts,
        maxAttempts: doc.maxAttempts,
        expiresAt: doc.expiresAt.toISOString(),
        usedAt: doc.usedAt ? doc.usedAt.toISOString() : null,
      };
    }

    const table =
      kind === 'email_verification' ? 'emailVerificationTokens' : 'passwordResetTokens';
    const row = this.sqlite!
      .prepare(`SELECT * FROM ${table} WHERE email = ? AND usedAt IS NULL ORDER BY createdAt DESC LIMIT 1`)
      .get(normalized) as Record<string, unknown> | undefined;
    if (!row) return null;
    return {
      id: String(row.id),
      userId: String(row.userId),
      email: String(row.email),
      otpHash: String(row.otpHash),
      attempts: Number(row.attempts),
      maxAttempts: Number(row.maxAttempts),
      expiresAt: String(row.expiresAt),
      usedAt: row.usedAt ? String(row.usedAt) : null,
    };
  }

  async incrementOtpAttempts(
    kind: 'email_verification' | 'password_reset',
    tokenId: string
  ): Promise<void> {
    if (this.mode === 'mongodb') {
      const Model =
        kind === 'email_verification' ? EmailVerificationTokenModel : PasswordResetTokenModel;
      await Model.updateOne({ _id: tokenId }, { $inc: { attempts: 1 } });
      return;
    }
    const table =
      kind === 'email_verification' ? 'emailVerificationTokens' : 'passwordResetTokens';
    this.sqlite!.prepare(`UPDATE ${table} SET attempts = attempts + 1 WHERE id = ?`).run(tokenId);
  }

  async markOtpUsed(
    kind: 'email_verification' | 'password_reset',
    tokenId: string
  ): Promise<void> {
    const now = new Date();
    if (this.mode === 'mongodb') {
      const Model =
        kind === 'email_verification' ? EmailVerificationTokenModel : PasswordResetTokenModel;
      await Model.updateOne({ _id: tokenId }, { $set: { usedAt: now } });
      return;
    }
    const table =
      kind === 'email_verification' ? 'emailVerificationTokens' : 'passwordResetTokens';
    this.sqlite!.prepare(`UPDATE ${table} SET usedAt = ? WHERE id = ?`).run(now.toISOString(), tokenId);
  }

  // ---------- CYCLE SETTINGS ----------
  async getCycleSettings(userId: string): Promise<CycleSettingsDTO> {
    if (this.mode === 'mongodb') {
      let doc = await CycleSettingsModel.findOne({ userId: new mongoose.Types.ObjectId(userId) });
      if (!doc) {
        doc = await CycleSettingsModel.create({
          userId: new mongoose.Types.ObjectId(userId),
          trackingPreferences: DEFAULT_TRACKING_PREFS,
          notificationPreferences: DEFAULT_NOTIFICATION_PREFS,
        });
      }
      return {
        id: doc._id.toString(),
        userId: doc.userId.toString(),
        lastPeriodStartDate: doc.lastPeriodStartDate,
        averageCycleLength: doc.averageCycleLength,
        averagePeriodDuration: doc.averagePeriodDuration,
        cycleRegularity: doc.cycleRegularity,
        usesDefaultEstimates: doc.usesDefaultEstimates,
        trackingPreferences: {
          ...DEFAULT_TRACKING_PREFS,
          ...doc.trackingPreferences,
        },
        notificationPreferences: {
          ...DEFAULT_NOTIFICATION_PREFS,
          ...doc.notificationPreferences,
        },
        updatedAt: doc.updatedAt.toISOString(),
      };
    }

    let row = this.sqlite!
      .prepare(`SELECT * FROM cycleSettings WHERE userId = ?`)
      .get(userId) as Record<string, unknown> | undefined;
    if (!row) {
      const now = new Date().toISOString();
      const id = crypto.randomUUID();
      this.sqlite!
        .prepare(
          `INSERT INTO cycleSettings (id, userId, lastPeriodStartDate, averageCycleLength, averagePeriodDuration, cycleRegularity, usesDefaultEstimates, trackingPreferencesJson, notificationPreferencesJson, updatedAt)
           VALUES (?, ?, NULL, 29, 5, 'unsure', 1, ?, ?, ?)`
        )
        .run(
          id,
          userId,
          JSON.stringify(DEFAULT_TRACKING_PREFS),
          JSON.stringify(DEFAULT_NOTIFICATION_PREFS),
          now
        );
      row = this.sqlite!.prepare(`SELECT * FROM cycleSettings WHERE userId = ?`).get(userId) as Record<
        string,
        unknown
      >;
    }

    return {
      id: String(row.id),
      userId: String(row.userId),
      lastPeriodStartDate: row.lastPeriodStartDate ? String(row.lastPeriodStartDate) : null,
      averageCycleLength: Number(row.averageCycleLength),
      averagePeriodDuration: Number(row.averagePeriodDuration),
      cycleRegularity: row.cycleRegularity as CycleRegularity,
      usesDefaultEstimates: Boolean(row.usesDefaultEstimates),
      trackingPreferences: {
        ...DEFAULT_TRACKING_PREFS,
        ...JSON.parse(String(row.trackingPreferencesJson)),
      },
      notificationPreferences: {
        ...DEFAULT_NOTIFICATION_PREFS,
        ...JSON.parse(String(row.notificationPreferencesJson)),
      },
      updatedAt: String(row.updatedAt),
    };
  }

  async updateCycleSettings(
    userId: string,
    patch: Partial<{
      lastPeriodStartDate: string | null;
      averageCycleLength: number;
      averagePeriodDuration: number;
      cycleRegularity: CycleRegularity;
      usesDefaultEstimates: boolean;
      trackingPreferences: Partial<TrackingPreferences>;
      notificationPreferences: Partial<NotificationPreferences>;
    }>
  ): Promise<CycleSettingsDTO> {
    const current = await this.getCycleSettings(userId);
    const nextTracking: TrackingPreferences = {
      ...current.trackingPreferences,
      ...(patch.trackingPreferences || {}),
    };
    const nextNotification: NotificationPreferences = {
      ...current.notificationPreferences,
      ...(patch.notificationPreferences || {}),
    };

    if (this.mode === 'mongodb') {
      await CycleSettingsModel.updateOne(
        { userId: new mongoose.Types.ObjectId(userId) },
        {
          $set: {
            lastPeriodStartDate:
              patch.lastPeriodStartDate !== undefined
                ? patch.lastPeriodStartDate
                : current.lastPeriodStartDate,
            averageCycleLength: patch.averageCycleLength ?? current.averageCycleLength,
            averagePeriodDuration: patch.averagePeriodDuration ?? current.averagePeriodDuration,
            cycleRegularity: patch.cycleRegularity ?? current.cycleRegularity,
            usesDefaultEstimates: patch.usesDefaultEstimates ?? current.usesDefaultEstimates,
            trackingPreferences: nextTracking,
            notificationPreferences: nextNotification,
          },
        }
      );
      return this.getCycleSettings(userId);
    }

    const now = new Date().toISOString();
    this.sqlite!
      .prepare(
        `UPDATE cycleSettings SET
          lastPeriodStartDate = ?,
          averageCycleLength = ?,
          averagePeriodDuration = ?,
          cycleRegularity = ?,
          usesDefaultEstimates = ?,
          trackingPreferencesJson = ?,
          notificationPreferencesJson = ?,
          updatedAt = ?
         WHERE userId = ?`
      )
      .run(
        patch.lastPeriodStartDate !== undefined
          ? patch.lastPeriodStartDate
          : current.lastPeriodStartDate,
        patch.averageCycleLength ?? current.averageCycleLength,
        patch.averagePeriodDuration ?? current.averagePeriodDuration,
        patch.cycleRegularity ?? current.cycleRegularity,
        (patch.usesDefaultEstimates ?? current.usesDefaultEstimates) ? 1 : 0,
        JSON.stringify(nextTracking),
        JSON.stringify(nextNotification),
        now,
        userId
      );
    return this.getCycleSettings(userId);
  }

  // ---------- PERIODS ----------
  async listPeriods(userId: string): Promise<PeriodRecord[]> {
    if (this.mode === 'mongodb') {
      const docs = await PeriodModel.find({ userId: new mongoose.Types.ObjectId(userId) }).sort({
        startDate: -1,
      });
      return docs.map((d) => ({
        id: d._id.toString(),
        userId: d.userId.toString(),
        startDate: d.startDate,
        endDate: d.endDate,
        flowIntensity: d.flowIntensity,
        notes: d.notes,
        createdAt: d.createdAt.toISOString(),
        updatedAt: d.updatedAt.toISOString(),
      }));
    }

    const rows = this.sqlite!
      .prepare(`SELECT * FROM periods WHERE userId = ? ORDER BY startDate DESC`)
      .all(userId) as Record<string, unknown>[];
    return rows.map((r) => ({
      id: String(r.id),
      userId: String(r.userId),
      startDate: String(r.startDate),
      endDate: String(r.endDate),
      flowIntensity: r.flowIntensity as FlowIntensity,
      notes: String(r.notes || ''),
      createdAt: String(r.createdAt),
      updatedAt: String(r.updatedAt),
    }));
  }

  async createPeriod(
    userId: string,
    input: { startDate: string; endDate: string; flowIntensity: FlowIntensity; notes?: string }
  ): Promise<PeriodRecord> {
    if (this.mode === 'mongodb') {
      const doc = await PeriodModel.create({
        userId: new mongoose.Types.ObjectId(userId),
        startDate: input.startDate,
        endDate: input.endDate,
        flowIntensity: input.flowIntensity,
        notes: input.notes || '',
      });
      return {
        id: doc._id.toString(),
        userId: doc.userId.toString(),
        startDate: doc.startDate,
        endDate: doc.endDate,
        flowIntensity: doc.flowIntensity,
        notes: doc.notes,
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
      };
    }

    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    this.sqlite!
      .prepare(
        `INSERT INTO periods (id, userId, startDate, endDate, flowIntensity, notes, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(id, userId, input.startDate, input.endDate, input.flowIntensity, input.notes || '', now, now);

    return {
      id,
      userId,
      startDate: input.startDate,
      endDate: input.endDate,
      flowIntensity: input.flowIntensity,
      notes: input.notes || '',
      createdAt: now,
      updatedAt: now,
    };
  }

  async updatePeriod(
    userId: string,
    periodId: string,
    input: { startDate: string; endDate: string; flowIntensity: FlowIntensity; notes?: string }
  ): Promise<PeriodRecord | null> {
    if (this.mode === 'mongodb') {
      if (!mongoose.isValidObjectId(periodId)) return null;
      const doc = await PeriodModel.findOneAndUpdate(
        { _id: periodId, userId: new mongoose.Types.ObjectId(userId) },
        {
          $set: {
            startDate: input.startDate,
            endDate: input.endDate,
            flowIntensity: input.flowIntensity,
            notes: input.notes ?? '',
          },
        },
        { new: true }
      );
      if (!doc) return null;
      return {
        id: doc._id.toString(),
        userId: doc.userId.toString(),
        startDate: doc.startDate,
        endDate: doc.endDate,
        flowIntensity: doc.flowIntensity,
        notes: doc.notes,
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
      };
    }

    const now = new Date().toISOString();
    const res = this.sqlite!
      .prepare(
        `UPDATE periods SET startDate = ?, endDate = ?, flowIntensity = ?, notes = ?, updatedAt = ?
         WHERE id = ? AND userId = ?`
      )
      .run(input.startDate, input.endDate, input.flowIntensity, input.notes ?? '', now, periodId, userId);
    if (res.changes === 0) return null;
    const row = this.sqlite!
      .prepare(`SELECT * FROM periods WHERE id = ? AND userId = ?`)
      .get(periodId, userId) as Record<string, unknown>;
    return {
      id: String(row.id),
      userId: String(row.userId),
      startDate: String(row.startDate),
      endDate: String(row.endDate),
      flowIntensity: row.flowIntensity as FlowIntensity,
      notes: String(row.notes || ''),
      createdAt: String(row.createdAt),
      updatedAt: String(row.updatedAt),
    };
  }

  async deletePeriod(userId: string, periodId: string): Promise<boolean> {
    if (this.mode === 'mongodb') {
      if (!mongoose.isValidObjectId(periodId)) return false;
      const res = await PeriodModel.deleteOne({
        _id: periodId,
        userId: new mongoose.Types.ObjectId(userId),
      });
      return res.deletedCount > 0;
    }
    const res = this.sqlite!
      .prepare(`DELETE FROM periods WHERE id = ? AND userId = ?`)
      .run(periodId, userId);
    return res.changes > 0;
  }

  // ---------- SYMPTOMS ----------
  async listSymptoms(userId: string): Promise<SymptomEntry[]> {
    if (this.mode === 'mongodb') {
      const docs = await SymptomModel.find({ userId: new mongoose.Types.ObjectId(userId) }).sort({
        date: -1,
        createdAt: -1,
      });
      return docs.map((d) => ({
        id: d._id.toString(),
        userId: d.userId.toString(),
        date: d.date,
        physicalSymptoms: d.physicalSymptoms,
        emotionalSymptoms: d.emotionalSymptoms,
        otherSymptomText: d.otherSymptomText,
        severity: d.severity,
        notes: d.notes,
        createdAt: d.createdAt.toISOString(),
        updatedAt: d.updatedAt.toISOString(),
      }));
    }

    const rows = this.sqlite!
      .prepare(`SELECT * FROM symptoms WHERE userId = ? ORDER BY date DESC, createdAt DESC`)
      .all(userId) as Record<string, unknown>[];
    return rows.map((r) => ({
      id: String(r.id),
      userId: String(r.userId),
      date: String(r.date),
      physicalSymptoms: JSON.parse(String(r.physicalSymptomsJson)),
      emotionalSymptoms: JSON.parse(String(r.emotionalSymptomsJson)),
      otherSymptomText: String(r.otherSymptomText || ''),
      severity: Number(r.severity),
      notes: String(r.notes || ''),
      createdAt: String(r.createdAt),
      updatedAt: String(r.updatedAt),
    }));
  }

  async createSymptom(
    userId: string,
    input: {
      date: string;
      physicalSymptoms: string[];
      emotionalSymptoms: string[];
      otherSymptomText?: string;
      severity: number;
      notes?: string;
    }
  ): Promise<SymptomEntry> {
    if (this.mode === 'mongodb') {
      const doc = await SymptomModel.create({
        userId: new mongoose.Types.ObjectId(userId),
        date: input.date,
        physicalSymptoms: input.physicalSymptoms,
        emotionalSymptoms: input.emotionalSymptoms,
        otherSymptomText: input.otherSymptomText || '',
        severity: input.severity,
        notes: input.notes || '',
      });
      return {
        id: doc._id.toString(),
        userId: doc.userId.toString(),
        date: doc.date,
        physicalSymptoms: doc.physicalSymptoms,
        emotionalSymptoms: doc.emotionalSymptoms,
        otherSymptomText: doc.otherSymptomText,
        severity: doc.severity,
        notes: doc.notes,
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
      };
    }

    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    this.sqlite!
      .prepare(
        `INSERT INTO symptoms (id, userId, date, physicalSymptomsJson, emotionalSymptomsJson, otherSymptomText, severity, notes, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        id,
        userId,
        input.date,
        JSON.stringify(input.physicalSymptoms),
        JSON.stringify(input.emotionalSymptoms),
        input.otherSymptomText || '',
        input.severity,
        input.notes || '',
        now,
        now
      );
    return {
      id,
      userId,
      date: input.date,
      physicalSymptoms: input.physicalSymptoms,
      emotionalSymptoms: input.emotionalSymptoms,
      otherSymptomText: input.otherSymptomText || '',
      severity: input.severity,
      notes: input.notes || '',
      createdAt: now,
      updatedAt: now,
    };
  }

  async updateSymptom(
    userId: string,
    id: string,
    input: {
      date: string;
      physicalSymptoms: string[];
      emotionalSymptoms: string[];
      otherSymptomText?: string;
      severity: number;
      notes?: string;
    }
  ): Promise<SymptomEntry | null> {
    if (this.mode === 'mongodb') {
      if (!mongoose.isValidObjectId(id)) return null;
      const doc = await SymptomModel.findOneAndUpdate(
        { _id: id, userId: new mongoose.Types.ObjectId(userId) },
        {
          $set: {
            date: input.date,
            physicalSymptoms: input.physicalSymptoms,
            emotionalSymptoms: input.emotionalSymptoms,
            otherSymptomText: input.otherSymptomText ?? '',
            severity: input.severity,
            notes: input.notes ?? '',
          },
        },
        { new: true }
      );
      if (!doc) return null;
      return {
        id: doc._id.toString(),
        userId: doc.userId.toString(),
        date: doc.date,
        physicalSymptoms: doc.physicalSymptoms,
        emotionalSymptoms: doc.emotionalSymptoms,
        otherSymptomText: doc.otherSymptomText,
        severity: doc.severity,
        notes: doc.notes,
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
      };
    }

    const now = new Date().toISOString();
    const res = this.sqlite!
      .prepare(
        `UPDATE symptoms SET date = ?, physicalSymptomsJson = ?, emotionalSymptomsJson = ?, otherSymptomText = ?, severity = ?, notes = ?, updatedAt = ?
         WHERE id = ? AND userId = ?`
      )
      .run(
        input.date,
        JSON.stringify(input.physicalSymptoms),
        JSON.stringify(input.emotionalSymptoms),
        input.otherSymptomText ?? '',
        input.severity,
        input.notes ?? '',
        now,
        id,
        userId
      );
    if (res.changes === 0) return null;
    const rows = await this.listSymptoms(userId);
    return rows.find((r) => r.id === id) || null;
  }

  async deleteSymptom(userId: string, id: string): Promise<boolean> {
    if (this.mode === 'mongodb') {
      if (!mongoose.isValidObjectId(id)) return false;
      const res = await SymptomModel.deleteOne({
        _id: id,
        userId: new mongoose.Types.ObjectId(userId),
      });
      return res.deletedCount > 0;
    }
    const res = this.sqlite!.prepare(`DELETE FROM symptoms WHERE id = ? AND userId = ?`).run(id, userId);
    return res.changes > 0;
  }

  // ---------- MOODS ----------
  async listMoods(userId: string): Promise<MoodEntry[]> {
    if (this.mode === 'mongodb') {
      const docs = await MoodEntryModel.find({ userId: new mongoose.Types.ObjectId(userId) }).sort({
        date: -1,
        createdAt: -1,
      });
      return docs.map((d) => ({
        id: d._id.toString(),
        userId: d.userId.toString(),
        date: d.date,
        mood: d.mood,
        notes: d.notes,
        createdAt: d.createdAt.toISOString(),
        updatedAt: d.updatedAt.toISOString(),
      }));
    }

    const rows = this.sqlite!
      .prepare(`SELECT * FROM moodEntries WHERE userId = ? ORDER BY date DESC, createdAt DESC`)
      .all(userId) as Record<string, unknown>[];
    return rows.map((r) => ({
      id: String(r.id),
      userId: String(r.userId),
      date: String(r.date),
      mood: r.mood as MoodType,
      notes: String(r.notes || ''),
      createdAt: String(r.createdAt),
      updatedAt: String(r.updatedAt),
    }));
  }

  async createMood(
    userId: string,
    input: { date: string; mood: MoodType; notes?: string }
  ): Promise<MoodEntry> {
    if (this.mode === 'mongodb') {
      const doc = await MoodEntryModel.create({
        userId: new mongoose.Types.ObjectId(userId),
        date: input.date,
        mood: input.mood,
        notes: input.notes || '',
      });
      return {
        id: doc._id.toString(),
        userId: doc.userId.toString(),
        date: doc.date,
        mood: doc.mood,
        notes: doc.notes,
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
      };
    }

    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    this.sqlite!
      .prepare(
        `INSERT INTO moodEntries (id, userId, date, mood, notes, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(id, userId, input.date, input.mood, input.notes || '', now, now);
    return {
      id,
      userId,
      date: input.date,
      mood: input.mood,
      notes: input.notes || '',
      createdAt: now,
      updatedAt: now,
    };
  }

  async updateMood(
    userId: string,
    id: string,
    input: { date: string; mood: MoodType; notes?: string }
  ): Promise<MoodEntry | null> {
    if (this.mode === 'mongodb') {
      if (!mongoose.isValidObjectId(id)) return null;
      const doc = await MoodEntryModel.findOneAndUpdate(
        { _id: id, userId: new mongoose.Types.ObjectId(userId) },
        { $set: { date: input.date, mood: input.mood, notes: input.notes ?? '' } },
        { new: true }
      );
      if (!doc) return null;
      return {
        id: doc._id.toString(),
        userId: doc.userId.toString(),
        date: doc.date,
        mood: doc.mood,
        notes: doc.notes,
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
      };
    }

    const now = new Date().toISOString();
    const res = this.sqlite!
      .prepare(
        `UPDATE moodEntries SET date = ?, mood = ?, notes = ?, updatedAt = ? WHERE id = ? AND userId = ?`
      )
      .run(input.date, input.mood, input.notes ?? '', now, id, userId);
    if (res.changes === 0) return null;
    const rows = await this.listMoods(userId);
    return rows.find((r) => r.id === id) || null;
  }

  async deleteMood(userId: string, id: string): Promise<boolean> {
    if (this.mode === 'mongodb') {
      if (!mongoose.isValidObjectId(id)) return false;
      const res = await MoodEntryModel.deleteOne({
        _id: id,
        userId: new mongoose.Types.ObjectId(userId),
      });
      return res.deletedCount > 0;
    }
    const res = this.sqlite!.prepare(`DELETE FROM moodEntries WHERE id = ? AND userId = ?`).run(id, userId);
    return res.changes > 0;
  }

  // ---------- WELLNESS ----------
  async listWellness(userId: string): Promise<WellnessEntry[]> {
    if (this.mode === 'mongodb') {
      const docs = await WellnessEntryModel.find({
        userId: new mongoose.Types.ObjectId(userId),
      }).sort({ date: -1, createdAt: -1 });
      return docs.map((d) => ({
        id: d._id.toString(),
        userId: d.userId.toString(),
        date: d.date,
        waterIntakeMl: d.waterIntakeMl,
        sleepHours: d.sleepHours,
        physicalActivityMinutes: d.physicalActivityMinutes,
        exerciseType: d.exerciseType,
        energyLevel: d.energyLevel,
        selfCareNotes: d.selfCareNotes,
        createdAt: d.createdAt.toISOString(),
        updatedAt: d.updatedAt.toISOString(),
      }));
    }

    const rows = this.sqlite!
      .prepare(`SELECT * FROM wellnessEntries WHERE userId = ? ORDER BY date DESC, createdAt DESC`)
      .all(userId) as Record<string, unknown>[];
    return rows.map((r) => ({
      id: String(r.id),
      userId: String(r.userId),
      date: String(r.date),
      waterIntakeMl: Number(r.waterIntakeMl),
      sleepHours: Number(r.sleepHours),
      physicalActivityMinutes: Number(r.physicalActivityMinutes),
      exerciseType: String(r.exerciseType || ''),
      energyLevel: Number(r.energyLevel),
      selfCareNotes: String(r.selfCareNotes || ''),
      createdAt: String(r.createdAt),
      updatedAt: String(r.updatedAt),
    }));
  }

  async createWellness(
    userId: string,
    input: {
      date: string;
      waterIntakeMl: number;
      sleepHours: number;
      physicalActivityMinutes: number;
      exerciseType?: string;
      energyLevel: number;
      selfCareNotes?: string;
    }
  ): Promise<WellnessEntry> {
    if (this.mode === 'mongodb') {
      const doc = await WellnessEntryModel.create({
        userId: new mongoose.Types.ObjectId(userId),
        date: input.date,
        waterIntakeMl: input.waterIntakeMl,
        sleepHours: input.sleepHours,
        physicalActivityMinutes: input.physicalActivityMinutes,
        exerciseType: input.exerciseType || '',
        energyLevel: input.energyLevel,
        selfCareNotes: input.selfCareNotes || '',
      });
      return {
        id: doc._id.toString(),
        userId: doc.userId.toString(),
        date: doc.date,
        waterIntakeMl: doc.waterIntakeMl,
        sleepHours: doc.sleepHours,
        physicalActivityMinutes: doc.physicalActivityMinutes,
        exerciseType: doc.exerciseType,
        energyLevel: doc.energyLevel,
        selfCareNotes: doc.selfCareNotes,
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
      };
    }

    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    this.sqlite!
      .prepare(
        `INSERT INTO wellnessEntries (id, userId, date, waterIntakeMl, sleepHours, physicalActivityMinutes, exerciseType, energyLevel, selfCareNotes, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        id,
        userId,
        input.date,
        input.waterIntakeMl,
        input.sleepHours,
        input.physicalActivityMinutes,
        input.exerciseType || '',
        input.energyLevel,
        input.selfCareNotes || '',
        now,
        now
      );
    return {
      id,
      userId,
      date: input.date,
      waterIntakeMl: input.waterIntakeMl,
      sleepHours: input.sleepHours,
      physicalActivityMinutes: input.physicalActivityMinutes,
      exerciseType: input.exerciseType || '',
      energyLevel: input.energyLevel,
      selfCareNotes: input.selfCareNotes || '',
      createdAt: now,
      updatedAt: now,
    };
  }

  async updateWellness(
    userId: string,
    id: string,
    input: {
      date: string;
      waterIntakeMl: number;
      sleepHours: number;
      physicalActivityMinutes: number;
      exerciseType?: string;
      energyLevel: number;
      selfCareNotes?: string;
    }
  ): Promise<WellnessEntry | null> {
    if (this.mode === 'mongodb') {
      if (!mongoose.isValidObjectId(id)) return null;
      const doc = await WellnessEntryModel.findOneAndUpdate(
        { _id: id, userId: new mongoose.Types.ObjectId(userId) },
        {
          $set: {
            date: input.date,
            waterIntakeMl: input.waterIntakeMl,
            sleepHours: input.sleepHours,
            physicalActivityMinutes: input.physicalActivityMinutes,
            exerciseType: input.exerciseType ?? '',
            energyLevel: input.energyLevel,
            selfCareNotes: input.selfCareNotes ?? '',
          },
        },
        { new: true }
      );
      if (!doc) return null;
      return {
        id: doc._id.toString(),
        userId: doc.userId.toString(),
        date: doc.date,
        waterIntakeMl: doc.waterIntakeMl,
        sleepHours: doc.sleepHours,
        physicalActivityMinutes: doc.physicalActivityMinutes,
        exerciseType: doc.exerciseType,
        energyLevel: doc.energyLevel,
        selfCareNotes: doc.selfCareNotes,
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
      };
    }

    const now = new Date().toISOString();
    const res = this.sqlite!
      .prepare(
        `UPDATE wellnessEntries SET date = ?, waterIntakeMl = ?, sleepHours = ?, physicalActivityMinutes = ?, exerciseType = ?, energyLevel = ?, selfCareNotes = ?, updatedAt = ?
         WHERE id = ? AND userId = ?`
      )
      .run(
        input.date,
        input.waterIntakeMl,
        input.sleepHours,
        input.physicalActivityMinutes,
        input.exerciseType ?? '',
        input.energyLevel,
        input.selfCareNotes ?? '',
        now,
        id,
        userId
      );
    if (res.changes === 0) return null;
    const rows = await this.listWellness(userId);
    return rows.find((r) => r.id === id) || null;
  }

  async deleteWellness(userId: string, id: string): Promise<boolean> {
    if (this.mode === 'mongodb') {
      if (!mongoose.isValidObjectId(id)) return false;
      const res = await WellnessEntryModel.deleteOne({
        _id: id,
        userId: new mongoose.Types.ObjectId(userId),
      });
      return res.deletedCount > 0;
    }
    const res = this.sqlite!
      .prepare(`DELETE FROM wellnessEntries WHERE id = ? AND userId = ?`)
      .run(id, userId);
    return res.changes > 0;
  }

  // ---------- NOTIFICATIONS ----------
  async listNotifications(userId: string): Promise<AppNotification[]> {
    if (this.mode === 'mongodb') {
      const docs = await NotificationModel.find({
        userId: new mongoose.Types.ObjectId(userId),
      })
        .sort({ scheduledForDate: -1, createdAt: -1 })
        .limit(40);
      return docs.map((d) => ({
        id: d._id.toString(),
        userId: d.userId.toString(),
        type: d.type,
        title: d.title,
        message: d.message,
        scheduledForDate: d.scheduledForDate,
        isRead: d.isRead,
        createdAt: d.createdAt.toISOString(),
      }));
    }

    const rows = this.sqlite!
      .prepare(
        `SELECT * FROM notifications WHERE userId = ? ORDER BY scheduledForDate DESC, createdAt DESC LIMIT 40`
      )
      .all(userId) as Record<string, unknown>[];
    return rows.map((r) => ({
      id: String(r.id),
      userId: String(r.userId),
      type: r.type as AppNotification['type'],
      title: String(r.title),
      message: String(r.message),
      scheduledForDate: String(r.scheduledForDate),
      isRead: Boolean(r.isRead),
      createdAt: String(r.createdAt),
    }));
  }

  async ensureNotification(
    userId: string,
    input: {
      type: AppNotification['type'];
      title: string;
      message: string;
      scheduledForDate: string;
    }
  ): Promise<AppNotification | null> {
    if (this.mode === 'mongodb') {
      const query: Record<string, unknown> = {
        userId: new mongoose.Types.ObjectId(userId),
        type: input.type,
        scheduledForDate: input.scheduledForDate,
      };
      if (input.type === 'custom_reminder') {
        query.title = input.title;
      }
      const existing = await NotificationModel.findOne(query);
      if (!existing) {
        const doc = await NotificationModel.create({
          userId: new mongoose.Types.ObjectId(userId),
          type: input.type,
          title: input.title,
          message: input.message,
          scheduledForDate: input.scheduledForDate,
          isRead: false,
        });
        return {
          id: doc._id.toString(),
          userId: doc.userId.toString(),
          type: doc.type,
          title: doc.title,
          message: doc.message,
          scheduledForDate: doc.scheduledForDate,
          isRead: doc.isRead,
          createdAt: doc.createdAt.toISOString(),
        };
      }
      return null;
    }

    const existing =
      input.type === 'custom_reminder'
        ? this.sqlite!.prepare(
            `SELECT id FROM notifications WHERE userId = ? AND type = ? AND scheduledForDate = ? AND title = ? LIMIT 1`
          ).get(userId, input.type, input.scheduledForDate, input.title)
        : this.sqlite!.prepare(
            `SELECT id FROM notifications WHERE userId = ? AND type = ? AND scheduledForDate = ? LIMIT 1`
          ).get(userId, input.type, input.scheduledForDate);

    if (!existing) {
      const id = crypto.randomUUID();
      const createdAt = new Date().toISOString();
      this.sqlite!
        .prepare(
          `INSERT INTO notifications (id, userId, type, title, message, scheduledForDate, isRead, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, 0, ?)`
        )
        .run(
          id,
          userId,
          input.type,
          input.title,
          input.message,
          input.scheduledForDate,
          createdAt
        );
      return {
        id,
        userId,
        type: input.type,
        title: input.title,
        message: input.message,
        scheduledForDate: input.scheduledForDate,
        isRead: false,
        createdAt,
      };
    }
    return null;
  }

  async markNotificationRead(userId: string, id: string): Promise<boolean> {
    if (this.mode === 'mongodb') {
      if (!mongoose.isValidObjectId(id)) return false;
      const res = await NotificationModel.updateOne(
        { _id: id, userId: new mongoose.Types.ObjectId(userId) },
        { $set: { isRead: true } }
      );
      return res.matchedCount > 0;
    }
    const res = this.sqlite!
      .prepare(`UPDATE notifications SET isRead = 1 WHERE id = ? AND userId = ?`)
      .run(id, userId);
    return res.changes > 0;
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    if (this.mode === 'mongodb') {
      await NotificationModel.updateMany(
        { userId: new mongoose.Types.ObjectId(userId), isRead: false },
        { $set: { isRead: true } }
      );
      return;
    }
    this.sqlite!.prepare(`UPDATE notifications SET isRead = 1 WHERE userId = ?`).run(userId);
  }

  // ---------- CUSTOM TIMED REMINDERS ----------
  async listCustomReminders(userId: string): Promise<CustomReminder[]> {
    if (this.mode === 'mongodb') {
      const docs = await CustomReminderModel.find({
        userId: new mongoose.Types.ObjectId(userId),
      }).sort({ reminderTime: 1, createdAt: -1 });
      return docs.map((d) => ({
        id: d._id.toString(),
        userId: d.userId.toString(),
        title: d.title,
        message: d.message,
        reminderTime: d.reminderTime,
        frequency: d.frequency,
        scheduledDate: d.scheduledDate,
        enabled: d.enabled,
        lastTriggeredDate: d.lastTriggeredDate,
        createdAt: d.createdAt.toISOString(),
        updatedAt: d.updatedAt.toISOString(),
      }));
    }

    const rows = this.sqlite!
      .prepare(`SELECT * FROM customReminders WHERE userId = ? ORDER BY reminderTime ASC, createdAt DESC`)
      .all(userId) as Record<string, unknown>[];
    return rows.map((r) => ({
      id: String(r.id),
      userId: String(r.userId),
      title: String(r.title),
      message: String(r.message || ''),
      reminderTime: String(r.reminderTime),
      frequency: (r.frequency === 'once' ? 'once' : 'daily') as 'daily' | 'once',
      scheduledDate: r.scheduledDate ? String(r.scheduledDate) : null,
      enabled: Boolean(r.enabled),
      lastTriggeredDate: r.lastTriggeredDate ? String(r.lastTriggeredDate) : null,
      createdAt: String(r.createdAt),
      updatedAt: String(r.updatedAt),
    }));
  }

  async createCustomReminder(
    userId: string,
    input: {
      title: string;
      message?: string;
      reminderTime: string;
      frequency: 'daily' | 'once';
      scheduledDate?: string | null;
      enabled?: boolean;
    }
  ): Promise<CustomReminder> {
    const enabled = input.enabled ?? true;
    const scheduledDate = input.frequency === 'once' ? input.scheduledDate || null : null;

    if (this.mode === 'mongodb') {
      const doc = await CustomReminderModel.create({
        userId: new mongoose.Types.ObjectId(userId),
        title: input.title,
        message: input.message || '',
        reminderTime: input.reminderTime,
        frequency: input.frequency,
        scheduledDate,
        enabled,
        lastTriggeredDate: null,
      });
      return {
        id: doc._id.toString(),
        userId: doc.userId.toString(),
        title: doc.title,
        message: doc.message,
        reminderTime: doc.reminderTime,
        frequency: doc.frequency,
        scheduledDate: doc.scheduledDate,
        enabled: doc.enabled,
        lastTriggeredDate: doc.lastTriggeredDate,
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
      };
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    this.sqlite!
      .prepare(
        `INSERT INTO customReminders (id, userId, title, message, reminderTime, frequency, scheduledDate, enabled, lastTriggeredDate, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`
      )
      .run(
        id,
        userId,
        input.title,
        input.message || '',
        input.reminderTime,
        input.frequency,
        scheduledDate,
        enabled ? 1 : 0,
        now,
        now
      );

    return {
      id,
      userId,
      title: input.title,
      message: input.message || '',
      reminderTime: input.reminderTime,
      frequency: input.frequency,
      scheduledDate,
      enabled,
      lastTriggeredDate: null,
      createdAt: now,
      updatedAt: now,
    };
  }

  async updateCustomReminder(
    userId: string,
    id: string,
    patch: Partial<{
      title: string;
      message: string;
      reminderTime: string;
      frequency: 'daily' | 'once';
      scheduledDate: string | null;
      enabled: boolean;
      lastTriggeredDate: string | null;
    }>
  ): Promise<CustomReminder | null> {
    if (this.mode === 'mongodb') {
      if (!mongoose.isValidObjectId(id)) return null;
      const doc = await CustomReminderModel.findOneAndUpdate(
        { _id: id, userId: new mongoose.Types.ObjectId(userId) },
        { $set: patch },
        { new: true }
      );
      if (!doc) return null;
      return {
        id: doc._id.toString(),
        userId: doc.userId.toString(),
        title: doc.title,
        message: doc.message,
        reminderTime: doc.reminderTime,
        frequency: doc.frequency,
        scheduledDate: doc.scheduledDate,
        enabled: doc.enabled,
        lastTriggeredDate: doc.lastTriggeredDate,
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
      };
    }

    const list = await this.listCustomReminders(userId);
    const existing = list.find((r) => r.id === id);
    if (!existing) return null;

    const nextFrequency = patch.frequency ?? existing.frequency;
    const nextScheduledDate =
      nextFrequency === 'once'
        ? patch.scheduledDate !== undefined
          ? patch.scheduledDate
          : existing.scheduledDate
        : null;
    const now = new Date().toISOString();

    this.sqlite!
      .prepare(
        `UPDATE customReminders SET title = ?, message = ?, reminderTime = ?, frequency = ?, scheduledDate = ?, enabled = ?, lastTriggeredDate = ?, updatedAt = ?
         WHERE id = ? AND userId = ?`
      )
      .run(
        patch.title ?? existing.title,
        patch.message ?? existing.message,
        patch.reminderTime ?? existing.reminderTime,
        nextFrequency,
        nextScheduledDate,
        (patch.enabled ?? existing.enabled) ? 1 : 0,
        patch.lastTriggeredDate !== undefined
          ? patch.lastTriggeredDate
          : existing.lastTriggeredDate,
        now,
        id,
        userId
      );

    const updatedList = await this.listCustomReminders(userId);
    return updatedList.find((r) => r.id === id) || null;
  }

  async deleteCustomReminder(userId: string, id: string): Promise<boolean> {
    if (this.mode === 'mongodb') {
      if (!mongoose.isValidObjectId(id)) return false;
      const res = await CustomReminderModel.deleteOne({
        _id: id,
        userId: new mongoose.Types.ObjectId(userId),
      });
      return res.deletedCount > 0;
    }
    const res = this.sqlite!
      .prepare(`DELETE FROM customReminders WHERE id = ? AND userId = ?`)
      .run(id, userId);
    return res.changes > 0;
  }

  // ---------- CONTENT ----------
  async getNutritionContent(): Promise<PhaseNutritionContent[]> {
    if (this.mode === 'mongodb') {
      const docs = await NutritionContentModel.find().lean();
      if (docs.length === 4) {
        const order = ['menstrual', 'follicular', 'ovulation', 'luteal'];
        return docs
          .sort((a, b) => order.indexOf(a.phase) - order.indexOf(b.phase))
          .map((d) => ({
            phase: d.phase,
            title: d.title,
            theme: d.theme,
            shortDescription: d.shortDescription,
            detailedGuidance: d.detailedGuidance,
            typicalDayRangeLabel: d.typicalDayRangeLabel,
            foodsToEnjoy: d.foodsToEnjoy as PhaseNutritionContent['foodsToEnjoy'],
            foodsOrHabitsToModerate: d.foodsOrHabitsToModerate,
            hydrationTip: d.hydrationTip,
            exerciseSuggestions: d.exerciseSuggestions,
            restAndSelfCare: d.restAndSelfCare,
            wellnessDisclaimer: d.wellnessDisclaimer,
          }));
      }
      return PHASE_NUTRITION_CONTENT;
    }

    const rows = this.sqlite!
      .prepare(`SELECT contentJson FROM nutritionContent`)
      .all() as { contentJson: string }[];
    if (rows.length === 4) {
      const order = ['menstrual', 'follicular', 'ovulation', 'luteal'];
      return rows
        .map((r) => JSON.parse(r.contentJson) as PhaseNutritionContent)
        .sort((a, b) => order.indexOf(a.phase) - order.indexOf(b.phase));
    }
    return PHASE_NUTRITION_CONTENT;
  }

  private mapMongoUser(doc: {
    _id: mongoose.Types.ObjectId;
    fullName: string;
    email: string;
    passwordHash: string;
    dateOfBirth: string;
    isEmailVerified: boolean;
    onboardingCompleted: boolean;
    timezone: string;
    themePreference: 'light' | 'dark';
    privacyShowEstimatesNotice: boolean;
    consentAcceptedAt: Date;
    createdAt: Date;
    updatedAt: Date;
  }): StoredUser {
    return {
      id: doc._id.toString(),
      fullName: doc.fullName,
      email: doc.email,
      passwordHash: doc.passwordHash,
      dateOfBirth: doc.dateOfBirth,
      isEmailVerified: doc.isEmailVerified,
      onboardingCompleted: doc.onboardingCompleted,
      timezone: doc.timezone,
      themePreference: doc.themePreference,
      privacyShowEstimatesNotice: doc.privacyShowEstimatesNotice,
      consentAcceptedAt: doc.consentAcceptedAt.toISOString(),
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    };
  }

  private mapSqliteUser(row: Record<string, unknown>): StoredUser {
    return {
      id: String(row.id),
      fullName: String(row.fullName),
      email: String(row.email),
      passwordHash: String(row.passwordHash),
      dateOfBirth: String(row.dateOfBirth),
      isEmailVerified: Boolean(row.isEmailVerified),
      onboardingCompleted: Boolean(row.onboardingCompleted),
      timezone: String(row.timezone),
      themePreference: (row.themePreference === 'dark' ? 'dark' : 'light') as 'light' | 'dark',
      privacyShowEstimatesNotice: Boolean(row.privacyShowEstimatesNotice),
      consentAcceptedAt: String(row.consentAcceptedAt),
      createdAt: String(row.createdAt),
      updatedAt: String(row.updatedAt),
    };
  }
}
