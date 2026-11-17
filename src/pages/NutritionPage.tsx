import { ChevronDown, ChevronUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { PHASE_NUTRITION_CONTENT } from '../../shared/nutritionData';
import type { CycleOverview, CyclePhaseId, PhaseNutritionContent } from '../../shared/types';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';

const PHASE_ACCENTS: Record<CyclePhaseId, string> = {
  menstrual: 'text-[#9D4E63] dark:text-[#E097AA]',
  follicular: 'text-[#5C7A67] dark:text-[#96B8A2]',
  ovulation: 'text-[#7E6B9B] dark:text-[#B9A7D6]',
  luteal: 'text-[#A67658] dark:text-[#DFB093]',
};

export function NutritionPage() {
  const { cycleSettings } = useAuth();
  const [phases, setPhases] = useState<PhaseNutritionContent[]>(PHASE_NUTRITION_CONTENT);
  const [currentPhase, setCurrentPhase] = useState<CyclePhaseId>('menstrual');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ menstrual: true });
  const [dietFilter, setDietFilter] = useState<'all' | 'vegetarian' | 'non_vegetarian'>(
    cycleSettings?.trackingPreferences?.dietPreference || 'all'
  );

  useEffect(() => {
    Promise.all([
      apiFetch<{ nutrition: PhaseNutritionContent[] }>('/api/content/nutrition'),
      apiFetch<CycleOverview>('/api/cycle/overview'),
    ])
      .then(([contentRes, ov]) => {
        if (contentRes.nutrition?.length) setPhases(contentRes.nutrition);
        if (ov?.currentPhase) {
          setCurrentPhase(ov.currentPhase);
          setExpanded({ [ov.currentPhase]: true });
        }
      })
      .catch(() => {
        // Fallback already seeded cleanly
      });
  }, []);

  const toggleCard = (phase: string) => {
    setExpanded((prev) => ({ ...prev, [phase]: !prev[phase] }));
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="max-w-2xl">
          <h1 className="font-display text-3xl font-semibold">Nutrition & Phase Wellness</h1>
          <p className="mt-1 text-sm text-[#594B53] dark:text-[#BFB2BA]">
            Explore balanced food ideas, hydration, gentle movement, and self-care across all four cycle phases—without restrictive diets or unsupported medical claims.
          </p>
        </div>

        <div className="inline-flex p-1 rounded-xl border border-[#DFD6CE] dark:border-[#3C333F] bg-[#FFFFFF] dark:bg-[#1D191F] shrink-0">
          {(
            [
              { v: 'all', l: 'All Options' },
              { v: 'vegetarian', l: 'Vegetarian' },
              { v: 'non_vegetarian', l: 'Non-Vegetarian' },
            ] as const
          ).map((opt) => (
            <button
              key={opt.v}
              type="button"
              onClick={() => setDietFilter(opt.v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap cursor-pointer ${
                dietFilter === opt.v
                  ? 'bg-[#9D4E63] text-white'
                  : 'text-[#594B53] dark:text-[#BFB2BA]'
              }`}
            >
              {opt.l}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {phases.map((phase) => {
          const isOpen = Boolean(expanded[phase.phase]);
          const isCurrent = phase.phase === currentPhase;
          return (
            <section
              key={phase.phase}
              className="rounded-2xl border border-[#E6DFD7] dark:border-[#352E38] bg-[#FFFFFF] dark:bg-[#1D191F] overflow-hidden"
            >
              <button
                type="button"
                onClick={() => toggleCard(phase.phase)}
                aria-expanded={isOpen}
                className="w-full p-6 flex items-start justify-between gap-4 text-left hover:bg-[#FAF8F6] dark:hover:bg-[#231E25] transition-colors cursor-pointer"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className={`font-semibold ${PHASE_ACCENTS[phase.phase]}`}>
                      Theme: {phase.theme}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="text-[#6E5D66] dark:text-[#A598A0]">
                      {phase.typicalDayRangeLabel}
                    </span>
                    {isCurrent && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-medium text-[#9D4E63] dark:text-[#E097AA]">
                          Estimated Current Phase
                        </span>
                      </>
                    )}
                  </div>
                  <h2 className="mt-1.5 font-display text-2xl font-semibold text-[#2B2328] dark:text-[#F4EEF2]">
                    {phase.title}
                  </h2>
                  <p className="mt-1.5 text-sm text-[#594B53] dark:text-[#C5B8C0] max-w-3xl">
                    {phase.shortDescription}
                  </p>
                </div>
                <span className="p-2 rounded-xl border border-[#E6DFD7] dark:border-[#352E38] shrink-0 text-[#594B53] dark:text-[#BFB2BA]">
                  {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </span>
              </button>

              {isOpen && (
                <div className="px-6 pb-6 pt-2 border-t border-[#EFEAE4] dark:border-[#2D2630] space-y-6">
                  <p className="text-sm text-[#594B53] dark:text-[#C5B8C0] leading-relaxed">
                    {phase.detailedGuidance}
                  </p>

                  <div>
                    <h3 className="text-sm font-semibold text-[#2B2328] dark:text-[#F4EEF2] mb-3">
                      Foods to Enjoy
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {phase.foodsToEnjoy.map((food) => (
                        <div
                          key={food.category}
                          className="p-4 rounded-xl border border-[#EFEAE4] dark:border-[#2D2630] bg-[#FAF8F6] dark:bg-[#141115]"
                        >
                          <h4 className="text-sm font-semibold text-[#2B2328] dark:text-[#F4EEF2]">
                            {food.category}
                          </h4>
                          <p className="text-xs text-[#6E5D66] dark:text-[#A598A0] mt-0.5">
                            {food.description}
                          </p>
                          {(dietFilter === 'all' || dietFilter === 'vegetarian') && (
                            <div className="mt-2.5">
                              <p className="text-[11px] font-medium text-[#5C7A67] dark:text-[#96B8A2]">
                                Vegetarian Options
                              </p>
                              <ul className="mt-1 space-y-1 text-xs text-[#594B53] dark:text-[#BFB2BA]">
                                {food.vegetarianOptions.map((item) => (
                                  <li key={item}>· {item}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {(dietFilter === 'all' || dietFilter === 'non_vegetarian') && (
                            <div className="mt-2.5">
                              <p className="text-[11px] font-medium text-[#9D4E63] dark:text-[#E097AA]">
                                Non-Vegetarian Options
                              </p>
                              <ul className="mt-1 space-y-1 text-xs text-[#594B53] dark:text-[#BFB2BA]">
                                {food.nonVegetarianOptions.map((item) => (
                                  <li key={item}>· {item}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                    <div>
                      <h3 className="text-sm font-semibold mb-2">Habits & Foods to Moderate</h3>
                      <ul className="space-y-1.5 text-xs text-[#594B53] dark:text-[#BFB2BA] leading-relaxed">
                        {phase.foodsOrHabitsToModerate.map((h) => (
                          <li key={h}>· {h}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold mb-2">Hydration & Movement</h3>
                      <p className="text-xs text-[#594B53] dark:text-[#BFB2BA] leading-relaxed mb-2">
                        {phase.hydrationTip}
                      </p>
                      <ul className="space-y-1 text-xs text-[#594B53] dark:text-[#BFB2BA]">
                        {phase.exerciseSuggestions.map((ex) => (
                          <li key={ex}>· {ex}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold mb-2">Rest & Self-Care</h3>
                      <ul className="space-y-1.5 text-xs text-[#594B53] dark:text-[#BFB2BA] leading-relaxed">
                        {phase.restAndSelfCare.map((r) => (
                          <li key={r}>· {r}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <p className="text-[11px] text-[#7A6B74] dark:text-[#968991] pt-3 border-t border-[#EFEAE4] dark:border-[#2D2630]">
                    {phase.wellnessDisclaimer}
                  </p>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
