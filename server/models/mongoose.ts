import mongoose, { Schema, Model } from 'mongoose';
import type {
  CyclePhaseId,
  CycleRegularity,
  FlowIntensity,
  MoodType,
} from '../../shared/types';

export interface IUserDoc {
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
}

export interface IPeriodDoc {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  startDate: string;
  endDate: string;
  flowIntensity: FlowIntensity;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICycleSettingsDoc {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  lastPeriodStartDate: string | null;
  averageCycleLength: number;
  averagePeriodDuration: number;
  cycleRegularity: CycleRegularity;
  usesDefaultEstimates: boolean;
  trackingPreferences: {
    trackSymptoms: boolean;
    trackMood: boolean;
    trackWellness: boolean;
    dietPreference: 'all' | 'vegetarian' | 'non_vegetarian';
  };
  notificationPreferences: {
    upcomingPeriodReminders: boolean;
    periodReminderDaysBefore: number;
    periodReminderTime?: string;
    wellnessReminders: boolean;
    wellnessReminderTime?: string;
    hydrationReminders: boolean;
    hydrationReminderTime?: string;
    browserNotificationsEnabled: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface ISymptomDoc {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  date: string;
  physicalSymptoms: string[];
  emotionalSymptoms: string[];
  otherSymptomText: string;
  severity: number;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IMoodEntryDoc {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  date: string;
  mood: MoodType;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IWellnessEntryDoc {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  date: string;
  waterIntakeMl: number;
  sleepHours: number;
  physicalActivityMinutes: number;
  exerciseType: string;
  energyLevel: number;
  selfCareNotes: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface INotificationDoc {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  type: 'period_reminder' | 'wellness_reminder' | 'hydration_reminder' | 'custom_reminder' | 'security';
  title: string;
  message: string;
  scheduledForDate: string;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICustomReminderDoc {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  title: string;
  message: string;
  reminderTime: string;
  frequency: 'daily' | 'once';
  scheduledDate: string | null;
  enabled: boolean;
  lastTriggeredDate: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface INutritionContentDoc {
  _id: mongoose.Types.ObjectId;
  phase: CyclePhaseId;
  title: string;
  theme: string;
  shortDescription: string;
  detailedGuidance: string;
  typicalDayRangeLabel: string;
  foodsToEnjoy: unknown[];
  foodsOrHabitsToModerate: string[];
  hydrationTip: string;
  exerciseSuggestions: string[];
  restAndSelfCare: string[];
  wellnessDisclaimer: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IOtpTokenDoc {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  email: string;
  otpHash: string;
  attempts: number;
  maxAttempts: number;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUserDoc>(
  {
    fullName: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    dateOfBirth: { type: String, required: true },
    isEmailVerified: { type: Boolean, default: false },
    onboardingCompleted: { type: Boolean, default: false },
    timezone: { type: String, default: 'UTC' },
    themePreference: { type: String, enum: ['light', 'dark'], default: 'light' },
    privacyShowEstimatesNotice: { type: Boolean, default: true },
    consentAcceptedAt: { type: Date, required: true },
  },
  { timestamps: true, collection: 'users' }
);

const periodSchema = new Schema<IPeriodDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    startDate: { type: String, required: true },
    endDate: { type: String, required: true },
    flowIntensity: {
      type: String,
      enum: ['spotting', 'light', 'medium', 'heavy'],
      default: 'medium',
    },
    notes: { type: String, default: '', maxlength: 1000 },
  },
  { timestamps: true, collection: 'periods' }
);
periodSchema.index({ userId: 1, startDate: -1 });

const cycleSettingsSchema = new Schema<ICycleSettingsDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    lastPeriodStartDate: { type: String, default: null },
    averageCycleLength: { type: Number, default: 29, min: 18, max: 60 },
    averagePeriodDuration: { type: Number, default: 5, min: 1, max: 14 },
    cycleRegularity: {
      type: String,
      enum: ['regular', 'somewhat_irregular', 'irregular', 'unsure'],
      default: 'unsure',
    },
    usesDefaultEstimates: { type: Boolean, default: true },
    trackingPreferences: {
      trackSymptoms: { type: Boolean, default: true },
      trackMood: { type: Boolean, default: true },
      trackWellness: { type: Boolean, default: true },
      dietPreference: {
        type: String,
        enum: ['all', 'vegetarian', 'non_vegetarian'],
        default: 'all',
      },
    },
    notificationPreferences: {
      upcomingPeriodReminders: { type: Boolean, default: true },
      periodReminderDaysBefore: { type: Number, default: 2, min: 1, max: 7 },
      periodReminderTime: { type: String, default: '08:30' },
      wellnessReminders: { type: Boolean, default: true },
      wellnessReminderTime: { type: String, default: '09:00' },
      hydrationReminders: { type: Boolean, default: false },
      hydrationReminderTime: { type: String, default: '14:00' },
      browserNotificationsEnabled: { type: Boolean, default: false },
    },
  },
  { timestamps: true, collection: 'cycleSettings' }
);

const symptomSchema = new Schema<ISymptomDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: String, required: true },
    physicalSymptoms: { type: [String], default: [] },
    emotionalSymptoms: { type: [String], default: [] },
    otherSymptomText: { type: String, default: '', maxlength: 200 },
    severity: { type: Number, required: true, min: 1, max: 5 },
    notes: { type: String, default: '', maxlength: 1000 },
  },
  { timestamps: true, collection: 'symptoms' }
);
symptomSchema.index({ userId: 1, date: -1 });

const moodEntrySchema = new Schema<IMoodEntryDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: String, required: true },
    mood: {
      type: String,
      required: true,
      enum: ['happy', 'calm', 'energetic', 'neutral', 'anxious', 'sad', 'irritable', 'tired'],
    },
    notes: { type: String, default: '', maxlength: 1000 },
  },
  { timestamps: true, collection: 'moodEntries' }
);
moodEntrySchema.index({ userId: 1, date: -1 });

const wellnessEntrySchema = new Schema<IWellnessEntryDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: String, required: true },
    waterIntakeMl: { type: Number, default: 0, min: 0, max: 10000 },
    sleepHours: { type: Number, default: 7, min: 0, max: 24 },
    physicalActivityMinutes: { type: Number, default: 0, min: 0, max: 720 },
    exerciseType: { type: String, default: '', maxlength: 120 },
    energyLevel: { type: Number, default: 3, min: 1, max: 5 },
    selfCareNotes: { type: String, default: '', maxlength: 1000 },
  },
  { timestamps: true, collection: 'wellnessEntries' }
);
wellnessEntrySchema.index({ userId: 1, date: -1 });

const notificationSchema = new Schema<INotificationDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: ['period_reminder', 'wellness_reminder', 'hydration_reminder', 'custom_reminder', 'security'],
      required: true,
    },
    title: { type: String, required: true, maxlength: 160 },
    message: { type: String, required: true, maxlength: 500 },
    scheduledForDate: { type: String, required: true },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true, collection: 'notifications' }
);
notificationSchema.index({ userId: 1, scheduledForDate: -1 });

const customReminderSchema = new Schema<ICustomReminderDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, maxlength: 120 },
    message: { type: String, default: '', maxlength: 300 },
    reminderTime: { type: String, required: true },
    frequency: { type: String, enum: ['daily', 'once'], default: 'daily' },
    scheduledDate: { type: String, default: null },
    enabled: { type: Boolean, default: true },
    lastTriggeredDate: { type: String, default: null },
  },
  { timestamps: true, collection: 'customReminders' }
);
customReminderSchema.index({ userId: 1, reminderTime: 1 });

const nutritionContentSchema = new Schema<INutritionContentDoc>(
  {
    phase: {
      type: String,
      enum: ['menstrual', 'follicular', 'ovulation', 'luteal'],
      required: true,
      unique: true,
    },
    title: { type: String, required: true },
    theme: { type: String, required: true },
    shortDescription: { type: String, required: true },
    detailedGuidance: { type: String, required: true },
    typicalDayRangeLabel: { type: String, required: true },
    foodsToEnjoy: { type: [Schema.Types.Mixed], default: [] },
    foodsOrHabitsToModerate: { type: [String], default: [] },
    hydrationTip: { type: String, required: true },
    exerciseSuggestions: { type: [String], default: [] },
    restAndSelfCare: { type: [String], default: [] },
    wellnessDisclaimer: { type: String, required: true },
  },
  { timestamps: true, collection: 'nutritionContent' }
);

const otpTokenSchema = new Schema<IOtpTokenDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    otpHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 5 },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    usedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export const UserModel: Model<IUserDoc> =
  mongoose.models.User || mongoose.model<IUserDoc>('User', userSchema);

export const PeriodModel: Model<IPeriodDoc> =
  mongoose.models.Period || mongoose.model<IPeriodDoc>('Period', periodSchema);

export const CycleSettingsModel: Model<ICycleSettingsDoc> =
  mongoose.models.CycleSettings ||
  mongoose.model<ICycleSettingsDoc>('CycleSettings', cycleSettingsSchema);

export const SymptomModel: Model<ISymptomDoc> =
  mongoose.models.Symptom || mongoose.model<ISymptomDoc>('Symptom', symptomSchema);

export const MoodEntryModel: Model<IMoodEntryDoc> =
  mongoose.models.MoodEntry || mongoose.model<IMoodEntryDoc>('MoodEntry', moodEntrySchema);

export const WellnessEntryModel: Model<IWellnessEntryDoc> =
  mongoose.models.WellnessEntry ||
  mongoose.model<IWellnessEntryDoc>('WellnessEntry', wellnessEntrySchema);

export const NotificationModel: Model<INotificationDoc> =
  mongoose.models.Notification ||
  mongoose.model<INotificationDoc>('Notification', notificationSchema);

export const CustomReminderModel: Model<ICustomReminderDoc> =
  mongoose.models.CustomReminder ||
  mongoose.model<ICustomReminderDoc>('CustomReminder', customReminderSchema);

export const NutritionContentModel: Model<INutritionContentDoc> =
  mongoose.models.NutritionContent ||
  mongoose.model<INutritionContentDoc>('NutritionContent', nutritionContentSchema);

export const EmailVerificationTokenModel: Model<IOtpTokenDoc> =
  mongoose.models.EmailVerificationToken ||
  mongoose.model<IOtpTokenDoc>(
    'EmailVerificationToken',
    otpTokenSchema,
    'emailVerificationTokens'
  );

export const PasswordResetTokenModel: Model<IOtpTokenDoc> =
  mongoose.models.PasswordResetToken ||
  mongoose.model<IOtpTokenDoc>(
    'PasswordResetToken',
    otpTokenSchema,
    'passwordResetTokens'
  );
