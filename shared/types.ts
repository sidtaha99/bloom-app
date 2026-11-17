export type CyclePhaseId = 'menstrual' | 'follicular' | 'ovulation' | 'luteal';

export type FlowIntensity = 'spotting' | 'light' | 'medium' | 'heavy';

export type CycleRegularity = 'regular' | 'somewhat_irregular' | 'irregular' | 'unsure';

export type MoodType =
  | 'happy'
  | 'calm'
  | 'energetic'
  | 'neutral'
  | 'anxious'
  | 'sad'
  | 'irritable'
  | 'tired';

export type PhysicalSymptomType =
  | 'Cramps'
  | 'Headache'
  | 'Bloating'
  | 'Acne'
  | 'Fatigue'
  | 'Back pain'
  | 'Breast tenderness'
  | 'Nausea'
  | 'Other';

export type EmotionalSymptomType =
  | 'Irritability'
  | 'Stress'
  | 'Anxiety'
  | 'Low mood'
  | 'Emotional sensitivity'
  | 'Other feelings';

export interface NotificationPreferences {
  upcomingPeriodReminders: boolean;
  periodReminderDaysBefore: number;
  periodReminderTime?: string; // HH:MM (24h)
  wellnessReminders: boolean;
  wellnessReminderTime?: string; // HH:MM (24h)
  hydrationReminders: boolean;
  hydrationReminderTime?: string; // HH:MM (24h)
  browserNotificationsEnabled: boolean;
}

export interface TrackingPreferences {
  trackSymptoms: boolean;
  trackMood: boolean;
  trackWellness: boolean;
  dietPreference: 'all' | 'vegetarian' | 'non_vegetarian';
}

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  dateOfBirth: string;
  isEmailVerified: boolean;
  onboardingCompleted: boolean;
  timezone: string;
  themePreference: 'light' | 'dark';
  privacyShowEstimatesNotice: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CycleSettingsDTO {
  id: string;
  userId: string;
  lastPeriodStartDate: string | null;
  averageCycleLength: number;
  averagePeriodDuration: number;
  cycleRegularity: CycleRegularity;
  usesDefaultEstimates: boolean;
  trackingPreferences: TrackingPreferences;
  notificationPreferences: NotificationPreferences;
  updatedAt: string;
}

export interface PeriodRecord {
  id: string;
  userId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  flowIntensity: FlowIntensity;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface SymptomEntry {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  physicalSymptoms: string[];
  emotionalSymptoms: string[];
  otherSymptomText: string;
  severity: number; // 1 to 5
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface MoodEntry {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  mood: MoodType;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface WellnessEntry {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  waterIntakeMl: number;
  sleepHours: number;
  physicalActivityMinutes: number;
  exerciseType: string;
  energyLevel: number; // 1 to 5
  selfCareNotes: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  type: 'period_reminder' | 'wellness_reminder' | 'hydration_reminder' | 'custom_reminder' | 'security';
  title: string;
  message: string;
  scheduledForDate: string;
  isRead: boolean;
  createdAt: string;
}

export interface CustomReminder {
  id: string;
  userId: string;
  title: string;
  message: string;
  reminderTime: string; // HH:MM (24h)
  frequency: 'daily' | 'once';
  scheduledDate: string | null; // YYYY-MM-DD when frequency === 'once'
  enabled: boolean;
  lastTriggeredDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NutritionFoodItem {
  category: string;
  description: string;
  vegetarianOptions: string[];
  nonVegetarianOptions: string[];
}

export interface PhaseNutritionContent {
  phase: CyclePhaseId;
  title: string;
  theme: string;
  shortDescription: string;
  detailedGuidance: string;
  typicalDayRangeLabel: string;
  foodsToEnjoy: NutritionFoodItem[];
  foodsOrHabitsToModerate: string[];
  hydrationTip: string;
  exerciseSuggestions: string[];
  restAndSelfCare: string[];
  wellnessDisclaimer: string;
}

export interface CyclePhaseRange {
  phase: CyclePhaseId;
  name: string;
  theme: string;
  startDay: number;
  endDay: number;
}

export interface CycleHistoryItem {
  cycleNumber: number;
  startDate: string;
  endDate: string | null;
  periodDurationDays: number;
  cycleLengthDays: number | null;
  flowIntensity: FlowIntensity;
}

export interface CycleOverview {
  hasSufficientData: boolean;
  isEstimate: boolean;
  dataConfidence: 'limited' | 'moderate' | 'high';
  currentDate: string;
  currentCycleDay: number | null;
  estimatedCycleLength: number;
  estimatedPeriodDuration: number;
  cycleVariabilityDays: number | null;
  isIrregularPattern: boolean;
  currentPhase: CyclePhaseId;
  currentPhaseName: string;
  currentPhaseTheme: string;
  currentPhaseDescription: string;
  lastLoggedPeriod: PeriodRecord | null;
  estimatedNextPeriodStart: string | null;
  estimatedNextPeriodEnd: string | null;
  daysUntilNextPeriod: number | null;
  estimatedOvulationDate: string | null;
  estimatedFertileWindowStart: string | null;
  estimatedFertileWindowEnd: string | null;
  phaseRanges: CyclePhaseRange[];
  completedCyclesCount: number;
  predictionDisclaimer: string;
}

export interface CalendarDayInfo {
  date: string; // YYYY-MM-DD
  dayOfMonth: number;
  inCurrentMonth: boolean;
  isToday: boolean;
  isLoggedPeriod: boolean;
  loggedPeriodFlow: FlowIntensity | null;
  isEstimatedPeriod: boolean;
  isEstimatedFertile: boolean;
  isEstimatedOvulation: boolean;
  estimatedPhase: CyclePhaseId | null;
  cycleDay: number | null;
  hasSymptoms: boolean;
  mood: MoodType | null;
  hasWellness: boolean;
}

export interface CalendarMonthResponse {
  year: number;
  month: number; // 1-12
  days: CalendarDayInfo[];
  disclaimer: string;
}
