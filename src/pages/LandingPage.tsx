import {
  ChevronDown,
  ChevronUp,
  Lock,
  Moon,
  ShieldCheck,
  Sun,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PHASE_NUTRITION_CONTENT } from '../../shared/nutritionData';
import { BloomLogo } from '../components/BloomLogo';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const HERO_IMG = '/src/assets/images/hero_bloom_botanical_1794510229887.jpg';
const TEA_IMG = '/src/assets/images/nutrition_rest_tea_1794510229839.jpg';
const BOWL_IMG = '/src/assets/images/nutrition_renew_bowl_1794510228997.jpg';
const JOURNAL_IMG = '/src/assets/images/privacy_journal_linen_1794510229698.jpg';

const FAQS = [
  {
    q: 'Are cycle and ovulation predictions guaranteed to be exact?',
    a: 'No. Bloom uses your logged period history and cycle settings to compute statistical estimates. Human cycles naturally vary, so predictions must never be relied upon for contraception, fertility planning, or medical diagnosis.',
  },
  {
    q: 'What if my menstrual cycle is irregular or not 28 days?',
    a: 'Bloom never forces a 28-day cycle or assumes ovulation always occurs on day 14. Our calculation engine adapts dynamically to your logged start dates, computes cycle variability, and highlights irregular patterns clearly.',
  },
  {
    q: 'Who can view my cycle, symptom, and mood records?',
    a: 'Only you. Every record is scoped strictly to your authenticated account. Bloom does not include any administrator dashboard, does not sell or share reproductive health data for advertising, and never sends private cycle logs to external AI models.',
  },
  {
    q: 'Can I export or permanently delete my personal health data?',
    a: 'Yes. Inside Profile & Settings, you can export all of your records in CSV or JSON format at any time, or permanently delete your account and all associated database records.',
  },
  {
    q: 'Is Bloom suitable for both vegetarian and non-vegetarian diets?',
    a: 'Yes. Each of the four cycle phase guides offers balanced, non-restrictive food suggestions with both vegetarian and non-vegetarian options alongside gentle hydration, sleep, and movement ideas.',
  },
];

export function LandingPage() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [selectedPhaseIdx, setSelectedPhaseIdx] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  const activePhase = PHASE_NUTRITION_CONTENT[selectedPhaseIdx];

  return (
    <div className="min-h-screen bg-[#FAF8F6] text-[#2B2328] dark:bg-[#141115] dark:text-[#F4EEF2]">
      {/* Top Bar Contract: 3 clean zones */}
      <header className="sticky top-0 z-40 bg-[#FAF8F6]/92 dark:bg-[#141115]/92 backdrop-blur-md border-b border-[#E6DFD7] dark:border-[#352E38]">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-8">
          <Link to="/" aria-label="Bloom Home" className="shrink-0">
            <BloomLogo size={28} />
          </Link>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#594B53] dark:text-[#C5B8C0]">
            <a
              href="#tracking"
              className="hover:text-[#2B2328] dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Cycle Tracking
            </a>
            <a
              href="#phases"
              className="hover:text-[#2B2328] dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Four Phases
            </a>
            <a
              href="#nutrition"
              className="hover:text-[#2B2328] dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Nutrition
            </a>
            <a
              href="#privacy"
              className="hover:text-[#2B2328] dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Privacy
            </a>
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              to={user ? '/dashboard' : '/register'}
              className="px-4 py-2 rounded-xl bg-[#9D4E63] hover:bg-[#843E51] text-white text-sm font-medium transition-colors whitespace-nowrap shrink-0"
            >
              {user ? 'Open Dashboard' : 'Get Started'}
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(201,123,142,0.12),_transparent_55%),radial-gradient(ellipse_at_bottom_left,_rgba(110,145,123,0.10),_transparent_55%)]"
          aria-hidden="true"
        />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-8 pt-12 pb-16 sm:pt-16 sm:pb-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
            <div className="lg:col-span-6 flex flex-col justify-center">
              <div className="flex items-center gap-2 text-xs font-medium text-[#6E5D66] dark:text-[#B5A7B0] mb-4">
                <span>Your Personal Menstrual Wellness Companion</span>
                <span aria-hidden="true">·</span>
                <span>Private & User-Owned</span>
              </div>

              <h1 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight text-[#2B2328] dark:text-[#F4EEF2] leading-[1.12] [text-wrap:balance]">
                Understand your cycle with calm, personalized clarity.
              </h1>

              <p className="mt-5 text-base sm:text-lg text-[#594B53] dark:text-[#C5B8C0] leading-relaxed max-w-xl">
                Bloom brings together menstrual cycle tracking, adaptive phase estimates, symptom and mood journaling, timed wellness reminders, and calming mindful activities in one serene, private sanctuary.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  to={user ? '/dashboard' : '/register'}
                  className="px-6 py-3 rounded-xl bg-[#9D4E63] hover:bg-[#843E51] text-white text-sm font-medium shadow-sm transition-all hover:-translate-y-0.5 whitespace-nowrap"
                >
                  {user ? 'Go to Dashboard' : 'Get Started'}
                </Link>
                <a
                  href="#tracking"
                  className="px-6 py-3 rounded-xl border border-[#DFD6CE] dark:border-[#3C333F] bg-[#FFFFFF] dark:bg-[#1D191F] text-[#2B2328] dark:text-[#F4EEF2] hover:bg-[#F5F0EC] dark:hover:bg-[#262129] text-sm font-medium transition-colors whitespace-nowrap"
                >
                  Learn More
                </a>
                {!user && (
                  <Link
                    to="/login"
                    className="px-3 py-2 text-sm font-medium text-[#9D4E63] dark:text-[#E097AA] hover:underline whitespace-nowrap"
                  >
                    Sign in
                  </Link>
                )}
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="p-2.5 rounded-xl border border-[#DFD6CE] dark:border-[#3C333F] bg-[#FFFFFF] dark:bg-[#1D191F] text-[#594B53] dark:text-[#D5C9D0] hover:bg-[#F5F0EC] dark:hover:bg-[#262129] cursor-pointer"
                  aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
                  title={theme === 'dark' ? 'Light theme' : 'Dark theme'}
                >
                  {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="h-full min-h-[300px] sm:min-h-[380px] rounded-3xl overflow-hidden border border-[#E6DFD7] dark:border-[#352E38] bg-[#EFE8E2] dark:bg-[#231D25] shadow-sm">
                {!imgErrors.hero ? (
                  <img
                    src={HERO_IMG}
                    alt="Blush peonies and sage eucalyptus stems on warm travertine stone"
                    referrerPolicy="no-referrer"
                    onError={() => setImgErrors((p) => ({ ...p, hero: true }))}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br from-[#F5E7EB] via-[#FAF8F6] to-[#E6ECE7] dark:from-[#2C1E24] dark:to-[#1E2622]">
                    <BloomLogo size={48} showWordmark={false} />
                    <p className="mt-3 font-display text-lg text-[#594B53] dark:text-[#D5C9D0]">
                      Bloom Menstrual Wellness
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 01. Menstrual Cycle Tracking Introduction */}
      <section
        id="tracking"
        className="border-t border-[#E6DFD7] dark:border-[#352E38] bg-[#FFFFFF] dark:bg-[#1A161C] py-16 sm:py-20"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-medium text-[#9D4E63] dark:text-[#E097AA]">
              01. Thoughtful Cycle Awareness
            </p>
            <h2 className="mt-2 font-display text-3xl sm:text-4xl font-semibold text-[#2B2328] dark:text-[#F4EEF2] [text-wrap:balance]">
              Tracking built around real rhythms, never one-size-fits-all assumptions.
            </h2>
            <p className="mt-4 text-[#594B53] dark:text-[#C5B8C0] leading-relaxed">
              Every body moves differently. Bloom calculates cycle day, period duration, cycle variability, and upcoming window estimates from your own recorded logs—clearly distinguishing confirmed dates from statistical predictions.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-2xl border border-[#E6DFD7] dark:border-[#352E38] bg-[#FAF8F6] dark:bg-[#141115] transition-all hover:-translate-y-0.5 hover:shadow-sm">
              <h3 className="font-display text-xl font-semibold text-[#2B2328] dark:text-[#F4EEF2]">
                Interactive Calendar & .ics
              </h3>
              <p className="mt-2.5 text-sm text-[#594B53] dark:text-[#BFB2BA] leading-relaxed">
                See confirmed period days, estimated upcoming windows, symptoms, moods, and export schedules cleanly to your personal digital calendar.
              </p>
            </div>
            <div className="p-6 rounded-2xl border border-[#E6DFD7] dark:border-[#352E38] bg-[#FAF8F6] dark:bg-[#141115] transition-all hover:-translate-y-0.5 hover:shadow-sm">
              <h3 className="font-display text-xl font-semibold text-[#2B2328] dark:text-[#F4EEF2]">
                Timed & Background Alerts
              </h3>
              <p className="mt-2.5 text-sm text-[#594B53] dark:text-[#BFB2BA] leading-relaxed">
                Set custom daily or one-time reminders for hydration, wellness check-ins, and upcoming cycle estimates with in-app and browser alerts.
              </p>
            </div>
            <div className="p-6 rounded-2xl border border-[#E6DFD7] dark:border-[#352E38] bg-[#FAF8F6] dark:bg-[#141115] transition-all hover:-translate-y-0.5 hover:shadow-sm">
              <h3 className="font-display text-xl font-semibold text-[#2B2328] dark:text-[#F4EEF2]">
                Irregular Cycle Support
              </h3>
              <p className="mt-2.5 text-sm text-[#594B53] dark:text-[#BFB2BA] leading-relaxed">
                Whether your cycle is 24 days, 36 days, or varies month to month, Bloom adapts to your logged history without rigid assumptions.
              </p>
            </div>
            <div className="p-6 rounded-2xl border border-[#E6DFD7] dark:border-[#352E38] bg-[#FAF8F6] dark:bg-[#141115] transition-all hover:-translate-y-0.5 hover:shadow-sm">
              <h3 className="font-display text-xl font-semibold text-[#2B2328] dark:text-[#F4EEF2]">
                Relax & Mindful Play
              </h3>
              <p className="mt-2.5 text-sm text-[#594B53] dark:text-[#BFB2BA] leading-relaxed">
                Unwind inside Bloom with soothing botanical games, tactile bubble pop chimes, radial mandala sketching, and 4-7-8 guided breathing.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 02. Four Cycle Phase Explanations */}
      <section id="phases" className="py-16 sm:py-20 border-t border-[#E6DFD7] dark:border-[#352E38]">
        <div className="max-w-6xl mx-auto px-4 sm:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
            <div className="max-w-2xl">
              <p className="text-xs font-medium text-[#5C7A67] dark:text-[#96B8A2]">
                02. The Four Cycle Phases
              </p>
              <h2 className="mt-2 font-display text-3xl sm:text-4xl font-semibold text-[#2B2328] dark:text-[#F4EEF2] [text-wrap:balance]">
                Move in harmony with each phase of your cycle.
              </h2>
            </div>

            <div className="inline-flex flex-wrap gap-1.5 p-1.5 rounded-xl border border-[#E6DFD7] dark:border-[#352E38] bg-[#FFFFFF] dark:bg-[#1D191F]">
              {PHASE_NUTRITION_CONTENT.map((p, idx) => (
                <button
                  key={p.phase}
                  type="button"
                  onClick={() => setSelectedPhaseIdx(idx)}
                  className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                    selectedPhaseIdx === idx
                      ? 'bg-[#9D4E63] text-white'
                      : 'text-[#594B53] dark:text-[#BFB2BA] hover:bg-[#F5F0EC] dark:hover:bg-[#262129]'
                  }`}
                >
                  {p.title.replace(' Phase', '')}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-[#E6DFD7] dark:border-[#352E38] bg-[#FFFFFF] dark:bg-[#1D191F] p-6 sm:p-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-5">
                <p className="text-xs font-medium text-[#9D4E63] dark:text-[#E097AA]">
                  Theme: {activePhase.theme}
                </p>
                <h3 className="mt-1.5 font-display text-2xl sm:text-3xl font-semibold text-[#2B2328] dark:text-[#F4EEF2]">
                  {activePhase.title}
                </h3>
                <p className="mt-2 text-xs text-[#6E5D66] dark:text-[#A598A0]">
                  {activePhase.typicalDayRangeLabel}
                </p>
                <p className="mt-4 text-sm sm:text-base text-[#594B53] dark:text-[#C5B8C0] leading-relaxed">
                  {activePhase.detailedGuidance}
                </p>
              </div>

              <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-[#2B2328] dark:text-[#F4EEF2]">
                    Nourishing Focus
                  </h4>
                  <ul className="space-y-2 text-sm text-[#594B53] dark:text-[#BFB2BA]">
                    {activePhase.foodsToEnjoy.map((f) => (
                      <li key={f.category} className="leading-relaxed">
                        <span className="font-medium text-[#2B2328] dark:text-[#F4EEF2]">
                          {f.category}:
                        </span>{' '}
                        {f.vegetarianOptions[0]}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold text-[#2B2328] dark:text-[#F4EEF2]">
                      Movement & Rest
                    </h4>
                    <ul className="mt-2 space-y-1.5 text-sm text-[#594B53] dark:text-[#BFB2BA]">
                      {activePhase.exerciseSuggestions.slice(0, 2).map((ex) => (
                        <li key={ex}>· {ex}</li>
                      ))}
                      <li>· {activePhase.hydrationTip}</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 03. Nutrition & Wellness Overview */}
      <section
        id="nutrition"
        className="border-t border-[#E6DFD7] dark:border-[#352E38] bg-[#FFFFFF] dark:bg-[#1A161C] py-16 sm:py-20"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-6 grid grid-cols-2 gap-4">
              <div className="rounded-2xl overflow-hidden border border-[#E6DFD7] dark:border-[#352E38] aspect-[4/3] bg-[#EFE8E2] dark:bg-[#231D25]">
                {!imgErrors.tea ? (
                  <img
                    src={TEA_IMG}
                    alt="Warm herbal hibiscus tea with berries and pumpkin seeds"
                    referrerPolicy="no-referrer"
                    onError={() => setImgErrors((p) => ({ ...p, tea: true }))}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center p-4 text-center text-xs text-[#6E5D66]">
                    Rest and Restore Nutrition
                  </div>
                )}
              </div>
              <div className="rounded-2xl overflow-hidden border border-[#E6DFD7] dark:border-[#352E38] aspect-[4/3] bg-[#EFE8E2] dark:bg-[#231D25]">
                {!imgErrors.bowl ? (
                  <img
                    src={BOWL_IMG}
                    alt="Fresh greens, roasted sweet potato, avocado, and fermented kimchi bowl"
                    referrerPolicy="no-referrer"
                    onError={() => setImgErrors((p) => ({ ...p, bowl: true }))}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center p-4 text-center text-xs text-[#6E5D66]">
                    Rise and Renew Nutrition
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-6">
              <p className="text-xs font-medium text-[#7E6B9B] dark:text-[#B9A7D6]">
                03. Phase-Based Nutrition & Daily Wellness
              </p>
              <h2 className="mt-2 font-display text-3xl sm:text-4xl font-semibold text-[#2B2328] dark:text-[#F4EEF2] [text-wrap:balance]">
                Practical nourishment without restrictive rules.
              </h2>
              <p className="mt-4 text-[#594B53] dark:text-[#C5B8C0] leading-relaxed">
                Bloom pairs each phase with thoughtful, culturally adaptable food pairings—iron and vitamin C during menstruation, fresh greens and fermented foods in the follicular phase, balanced fiber and protein at ovulation, and magnesium-rich complex carbohydrates in the luteal phase.
              </p>
              <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
                <div className="p-4 rounded-xl border border-[#E6DFD7] dark:border-[#352E38] bg-[#FAF8F6] dark:bg-[#141115]">
                  <p className="font-semibold text-[#2B2328] dark:text-[#F4EEF2]">
                    Vegetarian & Non-Veg
                  </p>
                  <p className="text-xs text-[#6E5D66] dark:text-[#A598A0] mt-1">
                    Balanced alternatives tailored to how you eat.
                  </p>
                </div>
                <div className="p-4 rounded-xl border border-[#E6DFD7] dark:border-[#352E38] bg-[#FAF8F6] dark:bg-[#141115]">
                  <p className="font-semibold text-[#2B2328] dark:text-[#F4EEF2]">
                    Hydration, Sleep & Energy
                  </p>
                  <p className="text-xs text-[#6E5D66] dark:text-[#A598A0] mt-1">
                    Track everyday habits alongside your cycle.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 04. Privacy and Security */}
      <section id="privacy" className="py-16 sm:py-20 border-t border-[#E6DFD7] dark:border-[#352E38]">
        <div className="max-w-6xl mx-auto px-4 sm:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-6 order-2 lg:order-1">
              <p className="text-xs font-medium text-[#9D4E63] dark:text-[#E097AA]">
                04. Privacy & Reproductive Data Protection
              </p>
              <h2 className="mt-2 font-display text-3xl sm:text-4xl font-semibold text-[#2B2328] dark:text-[#F4EEF2] [text-wrap:balance]">
                Your health journal belongs strictly to you.
              </h2>
              <p className="mt-4 text-[#594B53] dark:text-[#C5B8C0] leading-relaxed">
                Reproductive health records deserve uncompromising confidentiality. Bloom is built from the ground up as a single-owner personal space—no public profiles, no advertising trackers, and no administrator access to your private logs.
              </p>

              <div className="mt-6 space-y-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="h-5 w-5 text-[#5C7A67] dark:text-[#96B8A2] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-[#2B2328] dark:text-[#F4EEF2]">
                      Protected Sessions & Hashed Passwords
                    </p>
                    <p className="text-xs text-[#594B53] dark:text-[#BFB2BA] mt-0.5">
                      bcrypt password hashing, HTTP-only signed cookies, OTP verification, and rate-limited authentication.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Lock className="h-5 w-5 text-[#9D4E63] dark:text-[#E097AA] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-[#2B2328] dark:text-[#F4EEF2]">
                      Export & Deletion Control
                    </p>
                    <p className="text-xs text-[#594B53] dark:text-[#BFB2BA] mt-0.5">
                      Download your records anytime in JSON or CSV, or permanently erase your account and every linked collection.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6 order-1 lg:order-2">
              <div className="rounded-2xl overflow-hidden border border-[#E6DFD7] dark:border-[#352E38] aspect-[4/3] bg-[#EFE8E2] dark:bg-[#231D25]">
                {!imgErrors.journal ? (
                  <img
                    src={JOURNAL_IMG}
                    alt="Minimalist linen wellness journal with dried lavender and brass pen"
                    referrerPolicy="no-referrer"
                    onError={() => setImgErrors((p) => ({ ...p, journal: true }))}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center p-8 text-center text-sm text-[#6E5D66]">
                    Private Personal Health Journal
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 05. Frequently Asked Questions */}
      <section className="border-t border-[#E6DFD7] dark:border-[#352E38] bg-[#FFFFFF] dark:bg-[#1A161C] py-16 sm:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-8">
          <div className="text-center mb-10">
            <p className="text-xs font-medium text-[#7E6B9B] dark:text-[#B9A7D6]">
              05. Frequently Asked Questions
            </p>
            <h2 className="mt-2 font-display text-3xl font-semibold text-[#2B2328] dark:text-[#F4EEF2]">
              Clear answers about how Bloom works
            </h2>
          </div>

          <div className="divide-y divide-[#E6DFD7] dark:divide-[#352E38] border-y border-[#E6DFD7] dark:border-[#352E38]">
            {FAQS.map((item, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={item.q} className="py-4">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full flex items-center justify-between gap-4 text-left py-1 cursor-pointer"
                    aria-expanded={isOpen}
                  >
                    <span className="text-base font-medium text-[#2B2328] dark:text-[#F4EEF2]">
                      {item.q}
                    </span>
                    {isOpen ? (
                      <ChevronUp className="h-4 w-4 shrink-0 text-[#6E5D66]" />
                    ) : (
                      <ChevronDown className="h-4 w-4 shrink-0 text-[#6E5D66]" />
                    )}
                  </button>
                  {isOpen && (
                    <p className="mt-3 text-sm text-[#594B53] dark:text-[#BFB2BA] leading-relaxed">
                      {item.a}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-12 text-center">
            <Link
              to={user ? '/dashboard' : '/register'}
              className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-[#9D4E63] hover:bg-[#843E51] text-white text-sm font-medium transition-colors"
            >
              {user ? 'Return to Dashboard' : 'Create Your Private Account'}
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#E6DFD7] dark:border-[#352E38] py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <BloomLogo size={24} />
            <p className="mt-2 text-xs text-[#6E5D66] dark:text-[#A598A0] max-w-md">
              Your Personal Menstrual Wellness Companion. Informational wellness support only — never medical advice or contraception.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-6 text-xs text-[#594B53] dark:text-[#BFB2BA]">
            <Link to="/privacy" className="hover:underline">
              Privacy Policy
            </Link>
            <Link to="/terms" className="hover:underline">
              Terms of Service
            </Link>
            <Link to="/disclaimer" className="hover:underline">
              Health Disclaimer
            </Link>
            <Link to="/login" className="hover:underline">
              Sign In
            </Link>
            <Link to="/register" className="hover:underline">
              Get Started
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
