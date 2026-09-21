import { useState } from "react";
import { Link, Navigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CircleMarker, MapContainer, TileLayer } from "react-leaflet";
import {
  ArrowLeft,
  ArrowRight,
  BedDouble,
  Building2,
  CalendarCheck,
  CalendarDays,
  Check,
  Info,
  MapPin,
  MessageCircle,
  Ruler,
  UserRound,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PROPERTY_TYPE_LABELS } from "@momentum/shared";
import type { OpportunityDetail } from "@momentum/shared";
import { RequestDialog } from "../../components/availability/RequestDialog";
import type { RequestTarget } from "../../components/availability/RequestDialog";
import { useChatWithAgent } from "../../components/site/ChatWithAgent";
import { PageSpinner } from "../../components/ui/Spinner";
import { ApiError, api } from "../../lib/api";
import { formatAvailability, formatPrice } from "../../lib/format";
import { AVAILABILITY_PATH, resultsPath } from "../../lib/site";
import { usePageMeta } from "../../lib/usePageMeta";
import { useAuthStore } from "../../store/auth";
import "leaflet/dist/leaflet.css";

type Fact = [string, string | null];

function num(value: number | null, suffix = ""): string | null {
  return value === null ? null : `${value.toLocaleString("en-US")}${suffix}`;
}

function money(value: number | null, currency: string): string | null {
  return value === null ? null : `${currency} ${value.toLocaleString("en-US")}`;
}

/** Type-specific specifications; empty values are dropped. */
function specifications(o: OpportunityDetail): Fact[] {
  const facts: Fact[] = [
    ["Property type", PROPERTY_TYPE_LABELS[o.type] ?? null],
    ["Total capacity", num(o.total_capacity, " persons")],
    ["Rooms", num(o.num_rooms)],
    ["Persons per room", num(o.persons_per_room)],
    ["Room size", num(o.room_size_sqft, " sq ft")],
    ["Total area", num(o.size_sqft, " sq ft")],
    ["Loading bays", num(o.num_loading_bays)],
    ["Year built", o.year_built === null ? null : String(o.year_built)],
  ];
  if (o.type === "labour_camp") {
    facts.push(["MOHRE certified", o.mohre_certified ? "Yes" : null], ["Ejari registered", o.ejari_registered ? "Yes" : null]);
  }
  if (o.type === "land") facts.push(["Tenure", o.freehold ? "Freehold" : "Leasehold"]);
  return facts;
}

/** Commercial information (spec §19). Price follows `show_price`; fees are shown when set. */
function commercials(o: OpportunityDetail): Fact[] {
  return [
    [o.opportunity_kind === "accommodation_sale" ? "Price" : "Rent", formatPrice(o.price, o.currency, o.price_period)],
    ["Security deposit", num(o.security_deposit_pct, "%")],
    ["Commission", num(o.commission_pct, "%")],
    ["Ejari fee", money(o.ejari_fee, o.currency)],
    ["Admin fee", money(o.admin_fee, o.currency)],
  ];
}

/**
 * Opportunity detail (spec §19). The API answers only when this opportunity is in the
 * caller's own completed enquiry's matches (403 NOT_QUALIFIED otherwise).
 */
export default function OpportunityDetailPage() {
  const { id = "" } = useParams();
  const [params] = useSearchParams();
  const enquiryId = params.get("enquiry") ?? "";
  const { token, role } = useAuthStore();
  const { openChat } = useChatWithAgent();
  const [requestTarget, setRequestTarget] = useState<RequestTarget | null>(null);

  const { data, isPending, error } = useQuery({
    queryKey: ["availability-opportunity", id, enquiryId],
    queryFn: () => api.availability.opportunity(id, enquiryId, token!),
    enabled: !!token && role === "customer" && !!enquiryId,
    retry: (count, e) => !(e instanceof ApiError && e.status < 500) && count < 2,
  });
  usePageMeta({ title: data?.opportunity.title ?? "Opportunity", noindex: true });

  if (!token || role !== "customer" || !enquiryId) return <Navigate to={AVAILABILITY_PATH} replace />;
  if (isPending) return <PageSpinner />;
  if (error) return <DetailError error={error} enquiryId={enquiryId} />;

  const o = data.opportunity;
  const request = (kind: RequestTarget["kind"]) => setRequestTarget({ kind, opportunity: o });
  const availability = formatAvailability(o.availability_date);
  const rooms =
    o.num_rooms !== null
      ? `${o.num_rooms} rooms${o.persons_per_room !== null ? ` × ${o.persons_per_room} persons` : ""}`
      : null;
  const keyFacts: Array<[LucideIcon, string | null]> = [
    [MapPin, o.location_text],
    [Users, o.total_capacity !== null ? `Capacity ${o.total_capacity.toLocaleString("en-US")} persons` : null],
    [BedDouble, rooms],
    [Building2, PROPERTY_TYPE_LABELS[o.type] ?? null],
    [Ruler, o.size_sqft !== null ? `${o.size_sqft.toLocaleString("en-US")} sq ft` : null],
    [CalendarDays, availability],
  ];

  return (
    <>
      <section className="border-b border-charcoal-100 bg-navy-50/60">
        <div className="container-site py-10 md:py-14">
          <Link
            to={resultsPath(enquiryId)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-navy-700 hover:text-navy-900"
          >
            <ArrowLeft className="h-4 w-4" /> Back to matched opportunities
          </Link>
          {o.reference_no && <p className="eyebrow mt-8">Ref. {o.reference_no}</p>}
          <h1 className="heading-2 mt-3">{o.title}</h1>
          <span className="gold-rule mt-6" aria-hidden />
          <p className="mt-6 flex items-center gap-2 text-charcoal-600">
            <MapPin className="h-4 w-4 text-charcoal-400" aria-hidden /> {o.location_text}
          </p>
        </div>
      </section>

      <section className="section pt-10 md:pt-14">
        <div className="container-site grid gap-10 lg:grid-cols-3">
          <div className="space-y-12 lg:col-span-2">
            <Gallery photos={o.photos} title={o.title} />

            <div>
              <h2 className="heading-3">Overview</h2>
              <ul className="mt-5 grid gap-3 text-sm text-charcoal-600 sm:grid-cols-2">
                {keyFacts.map(([Icon, value]) =>
                  value ? (
                    <li key={value} className="flex items-start gap-2">
                      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-charcoal-400" aria-hidden />
                      {value}
                    </li>
                  ) : null
                )}
              </ul>
              {(o.description ?? o.summary) && (
                <p className="mt-6 whitespace-pre-line leading-relaxed text-charcoal-600">{o.description ?? o.summary}</p>
              )}
            </div>

            {o.amenities.length > 0 && (
              <div>
                <h2 className="heading-3">Facilities</h2>
                <ul className="mt-5 grid gap-2 text-sm text-charcoal-700 sm:grid-cols-2">
                  {o.amenities.map((a) => (
                    <li key={a} className="flex items-center gap-2">
                      <Check className="h-4 w-4 shrink-0 text-gold-600" aria-hidden /> {a}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <FactTable title="Accommodation details" facts={specifications(o)} />
            <FactTable title="Commercial information" facts={commercials(o)} />

            {o.terms && (
              <div>
                <h2 className="heading-3">Terms</h2>
                <p className="mt-5 whitespace-pre-line text-sm leading-relaxed text-charcoal-600">{o.terms}</p>
              </div>
            )}

            {o.latitude !== null && o.longitude !== null && (
              <div>
                <h2 className="heading-3">Location</h2>
                <div className="mt-5 overflow-hidden rounded-xl border border-charcoal-100">
                  <MapContainer center={[o.latitude, o.longitude]} zoom={13} style={{ height: 320 }} scrollWheelZoom={false}>
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    />
                    <CircleMarker center={[o.latitude, o.longitude]} radius={10} pathOptions={{ color: "#132642" }} />
                  </MapContainer>
                </div>
              </div>
            )}
          </div>

          <aside className="lg:sticky lg:top-28 lg:self-start">
            <div className="card hover:shadow-card">
              <p className="text-xl font-semibold text-navy-900">{formatPrice(o.price, o.currency, o.price_period)}</p>
              {availability && <p className="mt-1 text-sm text-charcoal-500">{availability}</p>}

              <div className="mt-6 flex items-center gap-3 border-t border-charcoal-100 pt-6">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-navy-50 text-navy-400">
                  <UserRound className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-eyebrow text-charcoal-400">Your agent</p>
                  <p className="truncate font-semibold text-navy-900">{o.agent?.name ?? "Momentum Living team"}</p>
                </div>
              </div>

              <div className="mt-6 grid gap-2">
                <RequestButton
                  sent={o.requests.includes("viewing")}
                  onClick={() => request("viewing")}
                  icon={CalendarCheck}
                  label="Request Viewing"
                  sentLabel="Viewing Requested"
                  primary
                />
                <RequestButton
                  sent={o.requests.includes("info")}
                  onClick={() => request("info")}
                  icon={Info}
                  label="Request More Information"
                  sentLabel="Information Requested"
                />
                <button type="button" onClick={() => openChat(o.agent?.id ?? null)} className="btn-secondary w-full">
                  <MessageCircle className="h-4 w-4" /> Chat With Agent
                </button>
              </div>

              <p className="mt-6 text-xs leading-relaxed text-charcoal-400">
                Enquiry {data.enquiry.reference_no}. Owner details are kept confidential; your agent arranges all contact.
              </p>
            </div>
          </aside>
        </div>
      </section>

      <RequestDialog enquiryId={enquiryId} target={requestTarget} onClose={() => setRequestTarget(null)} />
    </>
  );
}

function Gallery({ photos, title }: { photos: OpportunityDetail["photos"]; title: string }) {
  const [active, setActive] = useState(0);
  const current = photos[active];

  return (
    <div>
      <div className="aspect-[16/10] overflow-hidden rounded-xl bg-navy-50">
        {current ? (
          <img src={current.url} alt={`${title}, photo ${active + 1} of ${photos.length}`} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-navy-200">
            <Building2 className="h-16 w-16" aria-hidden />
          </div>
        )}
      </div>
      {photos.length > 1 && (
        <ul className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {photos.map((p, i) => (
            <li key={p.id} className="shrink-0">
              <button
                type="button"
                onClick={() => setActive(i)}
                aria-label={`Show photo ${i + 1}`}
                aria-current={i === active}
                className={`overflow-hidden rounded-md border-2 ${i === active ? "border-gold-400" : "border-transparent"}`}
              >
                <img src={p.url} alt="" loading="lazy" className="h-16 w-24 object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FactTable({ title, facts }: { title: string; facts: Fact[] }) {
  const rows = facts.filter((f): f is [string, string] => f[1] !== null);
  if (rows.length === 0) return null;
  return (
    <div>
      <h2 className="heading-3">{title}</h2>
      <dl className="mt-5 divide-y divide-charcoal-100 rounded-xl border border-charcoal-100 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4 px-5 py-3">
            <dt className="text-charcoal-500">{label}</dt>
            <dd className="text-right font-medium text-navy-900">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

interface RequestButtonProps {
  sent: boolean;
  onClick: () => void;
  icon: LucideIcon;
  label: string;
  sentLabel: string;
  primary?: boolean;
}

function RequestButton({ sent, onClick, icon: Icon, label, sentLabel, primary }: RequestButtonProps) {
  return (
    <button type="button" disabled={sent} onClick={onClick} className={`${primary ? "btn-primary" : "btn-secondary"} w-full`}>
      {sent ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />} {sent ? sentLabel : label}
    </button>
  );
}

function DetailError({ error, enquiryId }: { error: Error; enquiryId: string }) {
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const expired = error instanceof ApiError && error.status === 401;
  const gone = error instanceof ApiError && error.status === 404;
  const notQualified = error instanceof ApiError && error.status === 403;

  return (
    <section className="section">
      <div className="container-site max-w-xl text-center">
        <h1 className="heading-3">
          {expired
            ? "Your session has expired"
            : gone
              ? "This opportunity is no longer available"
              : notQualified
                ? "This opportunity is not in your matches"
                : "Something went wrong"}
        </h1>
        <p className="mt-4 text-charcoal-500">
          {expired
            ? "For your security, please verify your mobile again to continue."
            : gone
              ? "It has been withdrawn since your enquiry. An agent can suggest similar options."
              : notQualified
                ? "Opportunity details are shown only for matches from your own completed enquiry."
                : "The opportunity could not be loaded. Please try again shortly."}
        </p>
        {expired || notQualified ? (
          <Link to={AVAILABILITY_PATH} onClick={expired ? clearAuth : undefined} className="btn-availability mt-8">
            Availability <ArrowRight className="h-4 w-4" />
          </Link>
        ) : (
          <Link to={resultsPath(enquiryId)} className="btn-primary mt-8">
            <ArrowLeft className="h-4 w-4" /> Back to matched opportunities
          </Link>
        )}
      </div>
    </section>
  );
}
