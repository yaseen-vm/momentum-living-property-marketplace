import { clsx } from "clsx";
import { Check } from "lucide-react";
import type { WizardStep } from "../../store/availabilityWizard";

const STEPS: Array<{ key: WizardStep | "results"; label: string }> = [
  { key: "type", label: "About you" },
  { key: "details", label: "Your details" },
  { key: "verify", label: "Verify mobile" },
  { key: "requirements", label: "Requirements" },
  { key: "results", label: "Results" },
];

/** Step 1 → 4 → Results progress indicator (spec §12). */
export function WizardProgress({ current }: { current: WizardStep | "results" }) {
  const currentIndex = STEPS.findIndex((s) => s.key === current);

  return (
    <nav aria-label="Enquiry progress">
      <ol className="flex items-start">
        {STEPS.map((step, i) => {
          const done = i < currentIndex;
          const active = i === currentIndex;
          return (
            <li key={step.key} className="relative flex flex-1 flex-col items-center text-center">
              {i > 0 && (
                <span
                  aria-hidden
                  className={clsx(
                    "absolute right-1/2 top-4 h-px w-full -translate-y-1/2",
                    i <= currentIndex ? "bg-navy-800" : "bg-charcoal-200"
                  )}
                />
              )}
              <span
                aria-current={active ? "step" : undefined}
                className={clsx(
                  "relative z-10 flex h-8 w-8 items-center justify-center rounded-full border text-sm font-semibold",
                  done && "border-navy-800 bg-navy-800 text-white",
                  active && "border-gold-400 bg-gold-400 text-navy-950",
                  !done && !active && "border-charcoal-200 bg-white text-charcoal-400"
                )}
              >
                {done ? <Check className="h-4 w-4" aria-hidden /> : i < STEPS.length - 1 ? i + 1 : "✓"}
              </span>
              <span
                className={clsx(
                  "mt-2 hidden text-xs font-medium sm:block",
                  active ? "text-navy-900" : "text-charcoal-400"
                )}
              >
                {step.label}
              </span>
              <span className="sr-only">
                {step.label}
                {done ? " (completed)" : active ? " (current step)" : ""}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="mt-4 text-center text-sm font-medium text-navy-900 sm:hidden">
        {currentIndex < STEPS.length - 1 ? `Step ${currentIndex + 1} of 4: ` : ""}
        {STEPS[currentIndex]?.label}
      </p>
    </nav>
  );
}
