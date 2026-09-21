import { OPPORTUNITY_KINDS_BY_USER_TYPE, resolveLocationSlugs, slugify } from "@momentum/shared";
import type { TypedRequirements } from "@momentum/shared";

// Rule-based matching engine (architecture.md, "Matching Engine").
// One indexed candidate query, then a cheap in-Worker score per candidate.

const CANDIDATE_LIMIT = 200;
const MAX_MATCHES = 20;
const MIN_SCORE = 40;
const DAY_MS = 24 * 60 * 60 * 1000;

const WEIGHT = { capacity: 30, budget: 25, date: 15, type: 15, facilities: 15 } as const;

export interface Candidate {
  id: string;
  type: string;
  total_capacity: number | null;
  price: number | null;
  price_period: string | null;
  availability_date: number | null;
  amenities: string | null;
}

export interface Match {
  listing_id: string;
  score: number;
}

type PriceBasis = "year" | "total";

/**
 * What the enquirer brings, normalised across user types.
 * `supply`: the enquirer is looking for accommodation (tenant, buyer, management company);
 * listing capacity/price/date are what is on offer.
 * `demand`: the enquirer has accommodation (landlord, seller); listing capacity/price/date
 * describe what a tenant or investor is looking for.
 */
interface Criteria {
  direction: "supply" | "demand";
  locationSlugs: string[];
  capacity?: number | undefined;
  capacityMax?: number | undefined;
  /** Supply: the enquirer's budget ceiling. Demand: the enquirer's asking price. */
  price?: number | undefined;
  priceBasis: PriceBasis;
  date?: number | undefined;
  propertyType?: string | undefined;
  facilities: string[];
}

function perYear(amount: number | undefined, period: string | undefined): number | undefined {
  if (amount === undefined) return undefined;
  return period === "month" ? amount * 12 : amount;
}

function maxDefined(...values: Array<number | undefined>): number | undefined {
  const defined = values.filter((v): v is number => v !== undefined);
  return defined.length ? Math.max(...defined) : undefined;
}

export function toCriteria(input: TypedRequirements): Criteria {
  const locationSlugs = resolveLocationSlugs(input.requirements.emirates, input.requirements.location_slugs);

  switch (input.user_type) {
    case "tenant": {
      const r = input.requirements;
      return {
        direction: "supply",
        locationSlugs,
        capacity: maxDefined(r.occupants, r.beds),
        price: perYear(r.budget_max, r.budget_period),
        priceBasis: "year",
        date: r.move_in_date,
        propertyType: r.property_type,
        facilities: r.facilities,
      };
    }
    case "buyer": {
      const r = input.requirements;
      return {
        direction: "supply",
        locationSlugs,
        capacity: r.capacity_min,
        capacityMax: r.capacity_max,
        price: r.budget_max,
        priceBasis: "total",
        propertyType: r.property_type,
        facilities: [],
      };
    }
    case "management_company":
      return {
        direction: "supply",
        locationSlugs,
        capacity: input.requirements.capacity_min,
        priceBasis: "year",
        facilities: [],
      };
    case "landlord": {
      const r = input.requirements;
      return {
        direction: "demand",
        locationSlugs,
        capacity: r.capacity,
        price: r.price_period === "total" ? r.asking_price : perYear(r.asking_price, r.price_period),
        priceBasis: r.price_period === "total" ? "total" : "year",
        date: r.availability_date,
        propertyType: r.property_type,
        facilities: r.facilities,
      };
    }
    case "seller": {
      const r = input.requirements;
      return {
        direction: "demand",
        locationSlugs,
        capacity: r.capacity,
        price: r.asking_price,
        priceBasis: "total",
        propertyType: r.property_type,
        facilities: r.facilities,
      };
    }
  }
}

/** Listing price on the enquirer's basis, or undefined when the two cannot be compared. */
function listingPrice(c: Candidate, basis: PriceBasis): number | undefined {
  if (c.price === null) return undefined;
  const period = c.price_period ?? "year";
  if (basis === "total") return period === "total" ? c.price : undefined;
  if (period === "total") return undefined;
  return period === "month" ? c.price * 12 : c.price;
}

/**
 * `have` should cover `need`. Full marks at 100 %, partial down to 75 %, excluded below.
 * Returns null to exclude, or the fraction of the dimension's weight earned.
 */
function coverage(have: number, need: number): number | null {
  if (need <= 0 || have >= need) return 1;
  const ratio = have / need;
  if (ratio < 0.75) return null;
  return (ratio - 0.75) / 0.25;
}

/** Cost within budget: full marks up to +10 %, partial to +25 %, excluded beyond. */
function affordability(budget: number, cost: number): number | null {
  if (budget <= 0) return cost <= 0 ? 1 : null;
  const ratio = cost / budget;
  if (ratio <= 1.1) return 1;
  if (ratio > 1.25) return null;
  return (1.25 - ratio) / 0.15;
}

function parseAmenities(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((a): a is string => typeof a === "string").map(slugify) : [];
  } catch {
    return [];
  }
}

/** Score 0–100, or null when the candidate fails capacity or budget by more than 25 %. */
export function scoreCandidate(criteria: Criteria, c: Candidate): number | null {
  const supply = criteria.direction === "supply";
  let score = 0;

  // Capacity: the enquirer's need vs what is offered (reversed for landlords/sellers).
  if (criteria.capacity === undefined) {
    score += WEIGHT.capacity;
  } else if (c.total_capacity === null) {
    score += WEIGHT.capacity / 2;
  } else {
    const fit = supply ? coverage(c.total_capacity, criteria.capacity) : coverage(criteria.capacity, c.total_capacity);
    if (fit === null) return null;
    if (supply && criteria.capacityMax !== undefined && c.total_capacity > criteria.capacityMax * 1.25) return null;
    score += WEIGHT.capacity * fit;
  }

  // Budget: price must sit within the budget (supply), or the demand's budget must reach
  // the asking price (demand).
  const price = listingPrice(c, criteria.priceBasis);
  if (criteria.price === undefined) {
    score += WEIGHT.budget;
  } else if (price === undefined) {
    score += WEIGHT.budget / 2;
  } else {
    const fit = supply ? affordability(criteria.price, price) : affordability(price, criteria.price);
    if (fit === null) return null;
    score += WEIGHT.budget * fit;
  }

  // Dates: available by the time it is needed, with a 30-day grace period.
  const [availableAt, neededBy] = supply
    ? [c.availability_date ?? undefined, criteria.date]
    : [criteria.date, c.availability_date ?? undefined];
  if (neededBy === undefined) {
    score += WEIGHT.date;
  } else if (availableAt === undefined) {
    score += WEIGHT.date / 2;
  } else if (availableAt <= neededBy) {
    score += WEIGHT.date;
  } else if (availableAt <= neededBy + 30 * DAY_MS) {
    score += (WEIGHT.date * 2) / 3;
  }

  if (!criteria.propertyType || criteria.propertyType === c.type) score += WEIGHT.type;

  // Facilities: share of the required list that is present on the other side.
  const listingFacilities = parseAmenities(c.amenities);
  const [required, present] = supply
    ? [criteria.facilities, listingFacilities]
    : [listingFacilities, criteria.facilities];
  if (required.length === 0) {
    score += WEIGHT.facilities;
  } else {
    const have = new Set(present);
    score += (WEIGHT.facilities * required.filter((f) => have.has(f)).length) / required.length;
  }

  return Math.round(score);
}

/**
 * Candidate query on idx_listings_matching
 * (status, is_available, opportunity_kind, location_slug, total_capacity), then scoring.
 */
export async function findMatches(db: D1Database, input: TypedRequirements): Promise<Match[]> {
  const criteria = toCriteria(input);
  const kinds = OPPORTUNITY_KINDS_BY_USER_TYPE[input.user_type];

  const params: string[] = [...kinds];
  let where = `status = 'approved' AND is_available = 1 AND opportunity_kind IN (${kinds.map(() => "?").join(", ")})`;
  if (criteria.locationSlugs.length > 0) {
    where += ` AND location_slug IN (${criteria.locationSlugs.map(() => "?").join(", ")})`;
    params.push(...criteria.locationSlugs);
  }

  const rows = await db
    .prepare(
      `SELECT id, type, total_capacity, price, price_period, availability_date, amenities
       FROM listings WHERE ${where} LIMIT ${CANDIDATE_LIMIT}`
    )
    .bind(...params)
    .all<Candidate>();

  const matches: Match[] = [];
  for (const candidate of rows.results) {
    const score = scoreCandidate(criteria, candidate);
    if (score !== null && score >= MIN_SCORE) matches.push({ listing_id: candidate.id, score });
  }
  return matches.sort((a, b) => b.score - a.score).slice(0, MAX_MATCHES);
}
