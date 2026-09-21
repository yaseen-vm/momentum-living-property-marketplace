import { BedDouble, Building2, CalendarDays, MapPin, MessageCircle, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PROPERTY_TYPE_LABELS } from "@momentum/shared";
import type { MatchedOpportunity } from "@momentum/shared";
import { useChatWithAgent } from "../site/ChatWithAgent";
import { formatAvailability, formatPrice } from "../../lib/format";

const MAX_FACILITIES = 5;

/**
 * Opportunity card (spec §18). Shows only enquirer-safe fields; the API never sends owner
 * identity, internal notes or exact coordinates.
 */
export function OpportunityCard({ opportunity: o }: { opportunity: MatchedOpportunity }) {
  const { openChat } = useChatWithAgent();
  const rooms =
    o.num_rooms !== null
      ? `${o.num_rooms} rooms${o.persons_per_room !== null ? ` × ${o.persons_per_room} persons` : ""}`
      : null;
  const availability = formatAvailability(o.availability_date);

  const facts: Array<[LucideIcon, string | null]> = [
    [MapPin, o.location_text],
    [Users, o.total_capacity !== null ? `Capacity ${o.total_capacity.toLocaleString("en-US")} persons` : null],
    [BedDouble, rooms],
    [Building2, PROPERTY_TYPE_LABELS[o.type] ?? null],
    [CalendarDays, availability],
  ];

  return (
    <article className="card flex h-full flex-col p-0 md:p-0">
      <div className="aspect-[16/10] overflow-hidden rounded-t-xl bg-navy-50">
        {o.cover_photo_url ? (
          <img src={o.cover_photo_url} alt={o.title} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-navy-200">
            <Building2 className="h-14 w-14" aria-hidden />
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-6">
        {o.reference_no && <p className="eyebrow">Ref. {o.reference_no}</p>}
        <h2 className="mt-2 font-serif text-xl leading-snug text-navy-900">{o.title}</h2>

        <ul className="mt-4 space-y-2 text-sm text-charcoal-600">
          {facts.map(([Icon, value]) =>
            value ? (
              <li key={value} className="flex items-start gap-2">
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-charcoal-400" aria-hidden />
                {value}
              </li>
            ) : null
          )}
        </ul>

        {o.amenities.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Facilities">
            {o.amenities.slice(0, MAX_FACILITIES).map((a) => (
              <li key={a} className="rounded-full bg-navy-50 px-2.5 py-1 text-xs text-navy-800">
                {a}
              </li>
            ))}
            {o.amenities.length > MAX_FACILITIES && (
              <li className="px-1 py-1 text-xs text-charcoal-400">+{o.amenities.length - MAX_FACILITIES} more</li>
            )}
          </ul>
        )}

        {o.summary && <p className="mt-4 text-sm leading-relaxed text-charcoal-500">{o.summary}</p>}

        <div className="mt-auto pt-6">
          <p className="font-semibold text-navy-900">{formatPrice(o.price, o.currency, o.price_period)}</p>
          <button type="button" onClick={() => openChat(o.agent?.id ?? null)} className="btn-secondary mt-4 w-full">
            <MessageCircle className="h-4 w-4" /> Chat With Agent
          </button>
        </div>
      </div>
    </article>
  );
}
