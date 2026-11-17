import { Link } from 'react-router-dom';
import { BloomLogo } from '../components/BloomLogo';

function LegalWrapper({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#FAF8F6] dark:bg-[#141115] text-[#2B2328] dark:text-[#F4EEF2] py-10 px-4 sm:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between pb-6 border-b border-[#E6DFD7] dark:border-[#352E38]">
          <Link to="/">
            <BloomLogo size={26} />
          </Link>
          <Link
            to="/dashboard"
            className="text-sm font-medium text-[#9D4E63] dark:text-[#E097AA] hover:underline"
          >
            Back to App
          </Link>
        </div>
        <h1 className="mt-8 font-display text-3xl sm:text-4xl font-semibold">{title}</h1>
        <p className="mt-2 text-xs text-[#6E5D66] dark:text-[#A598A0]">Effective: {updated}</p>
        <div className="mt-6 space-y-5 text-sm sm:text-base text-[#594B53] dark:text-[#C5B8C0] leading-relaxed">
          {children}
        </div>
      </div>
    </div>
  );
}

export function PrivacyPolicyPage() {
  return (
    <LegalWrapper title="Privacy Policy & Data Retention" updated="November 2026">
      <p>
        Bloom treats menstrual, reproductive, symptom, mood, and daily wellness records as highly sensitive personal information. Your data is collected solely to provide your personal tracking dashboard, cycle calculations, and reminders.
      </p>
      <h2 className="font-display text-xl font-semibold text-[#2B2328] dark:text-[#F4EEF2] pt-2">
        Strict Personal Ownership
      </h2>
      <p>
        Every record is bound to your authenticated user ID. Bloom contains no administrator dashboard, no cross-user viewing capability, no third-party advertising trackers, and never sends private cycle records to external AI services.
      </p>
      <h2 className="font-display text-xl font-semibold text-[#2B2328] dark:text-[#F4EEF2] pt-2">
        Security Safeguards
      </h2>
      <p>
        Passwords are hashed using bcrypt. Authentication sessions use HTTP-only signed cookies with CSRF and rate-limiting protections. Verification and password reset codes expire after 15 minutes with strict attempt limits.
      </p>
      <h2 className="font-display text-xl font-semibold text-[#2B2328] dark:text-[#F4EEF2] pt-2">
        Data Export & Deletion Policy
      </h2>
      <p>
        You may export a complete copy of your profile, cycle settings, periods, symptoms, moods, and wellness logs in JSON or CSV format anytime from Profile & Settings. Deleting your account immediately and permanently deletes your user profile and all associated collections from the database.
      </p>
    </LegalWrapper>
  );
}

export function TermsPage() {
  return (
    <LegalWrapper title="Terms of Service" updated="November 2026">
      <p>
        By creating a Bloom account, you confirm that you are at least 13 years of age and consent to the secure storage of your self-entered wellness records as described in our Privacy Policy.
      </p>
      <p>
        Bloom is provided for personal educational and self-tracking purposes. You retain full ownership of all information you log and may export or erase it at any time.
      </p>
      <p>
        You agree not to attempt unauthorized access, automated scraping, or disruption of the service.
      </p>
    </LegalWrapper>
  );
}

export function HealthDisclaimerPage() {
  return (
    <LegalWrapper title="Health & Cycle Prediction Disclaimer" updated="November 2026">
      <p>
        Bloom is a personal menstrual wellness companion and educational tool. It does not provide medical advice, diagnosis, clinical treatment, or mental health evaluation.
      </p>
      <p>
        All cycle phase labels, upcoming period dates, fertile window dates, and ovulation dates shown in Bloom are statistical estimates derived from your logged history and configured defaults. Menstrual cycles naturally fluctuate due to stress, sleep, life stage, health conditions, and many other factors.
      </p>
      <p className="font-semibold text-[#2B2328] dark:text-[#F4EEF2]">
        Do NOT rely on Bloom predictions for contraception, pregnancy prevention, or fertility diagnosis.
      </p>
      <p>
        If you experience severe pain, unusually heavy bleeding, missed periods, or persistent physical or emotional distress, please consult a qualified healthcare professional.
      </p>
    </LegalWrapper>
  );
}
