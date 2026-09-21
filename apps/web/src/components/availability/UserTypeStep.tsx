import { clsx } from "clsx";
import { Building2, ClipboardList, HardHat, KeyRound, Tag } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { USER_TYPE_LABELS } from "@momentum/shared";
import type { UserType } from "@momentum/shared";
import { useContent } from "../../lib/content";

const OPTIONS: Array<{ type: UserType; description: string; icon: LucideIcon }> = [
  { type: "tenant", description: "I am looking for labour accommodation / a labour camp.", icon: HardHat },
  { type: "landlord", description: "I own or represent accommodation/property.", icon: KeyRound },
  {
    type: "management_company",
    description: "I represent a company involved in managing or operating accommodation.",
    icon: ClipboardList,
  },
  { type: "buyer", description: "I'm interested in buying.", icon: Building2 },
  { type: "seller", description: "I'm interested in selling.", icon: Tag },
];

interface UserTypeStepProps {
  selected: UserType | null;
  onSelect: (type: UserType) => void;
}

/** Step 1: "How can we help you?" Buyer and Seller appear only when enabled in availability_config. */
export function UserTypeStep({ selected, onSelect }: UserTypeStepProps) {
  const { data: config } = useContent("availability_config");
  const options = OPTIONS.filter(
    (o) => (o.type !== "buyer" || config.enable_buyer) && (o.type !== "seller" || config.enable_seller)
  );

  return (
    <div>
      <h2 className="heading-2">How can we help you?</h2>
      <p className="lead mt-3">Choose the option that describes you best. The next steps adapt to your choice.</p>

      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {options.map(({ type, description, icon: Icon }) => (
          <li key={type}>
            <button
              type="button"
              onClick={() => onSelect(type)}
              aria-pressed={selected === type}
              className={clsx(
                "card flex h-full w-full flex-col items-start text-left hover:border-navy-300",
                selected === type && "border-navy-800 ring-2 ring-navy-800/15"
              )}
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-navy-50 text-navy-800">
                <Icon className="h-6 w-6" aria-hidden />
              </span>
              <span className="mt-5 font-serif text-xl text-navy-900">{USER_TYPE_LABELS[type]}</span>
              <span className="mt-2 text-sm leading-relaxed text-charcoal-500">{description}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
