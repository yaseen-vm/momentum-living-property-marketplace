// ─── Corporate content (site_content) ────────────────────────────────────────
//
// One `site_content` row per key; `value` is the JSON shape below. Every value
// is admin-editable. `DEFAULT_SITE_CONTENT` is the placeholder seed (migration
// 0004) and the web fallback when the API is unreachable. It must never contain
// invented facts (spec §30): no names, numbers, emails, addresses, years or claims.

export interface TitledText {
  title: string;
  text: string;
}

/** `site_content.home` (spec §4–5). The hero headline and text are fixed by the spec. */
export interface HomeContent {
  about_intro: string;
  audiences: string[];
}

/** `site_content.about` (spec §10). */
export interface AboutContent {
  who_we_are: string;
  what_we_do: TitledText[];
  who_we_work_with: TitledText[];
  why_us: string;
  approach_steps: TitledText[];
}

/** Icon names map to Lucide icons in the web app (`lib/featureIcons.ts`). */
export type FeatureIcon =
  | "compass"
  | "network"
  | "users"
  | "zap"
  | "line-chart"
  | "handshake"
  | "shield"
  | "headset";

export interface WhyChooseFeature {
  title: string;
  /** One line for the Home page cards. */
  summary: string;
  /** Supporting copy for the Why Choose Us page. */
  text: string;
  icon: FeatureIcon;
}

/** `site_content.why_choose_us` (spec §6). */
export interface WhyChooseUsContent {
  intro: string;
  features: WhyChooseFeature[];
}

/** `site_content.md_profile` (spec §7). */
export interface MdProfileContent {
  name: string;
  title: string;
  /** R2 key under `public-media/`, or empty for the portrait placeholder. */
  photo_key: string;
  biography: string;
  experience: string;
  philosophy: string;
  vision: string;
  commitment_clients: string;
  commitment_standards: string;
  market_vision: string;
}

/** `site_content.md_note` (spec §8). `body` paragraphs are separated by blank lines. */
export interface MdNoteContent {
  heading: string;
  body: string;
  signature_name: string;
}

/** `site_content.company`: admin-editable company details (spec §10, §25). */
export interface CompanyContent {
  phone: string;
  whatsapp: string;
  email: string;
  general_email: string;
  sales_email: string;
  management_email: string;
  address: string;
  working_hours: string;
  socials: { linkedin: string; instagram: string; other: { label: string; url: string }[] };
}

/**
 * `site_content.legal_privacy` / `legal_terms` (spec §22).
 * `body_markdown` supports `## heading`, `- item` lists and blank-line paragraphs.
 */
export interface LegalContent {
  body_markdown: string;
  /** Display date such as `21 September 2026`, or empty until wording is supplied. */
  updated_on: string;
}

/** `site_content.availability_config` (spec §13–14). Read by the Availability wizard. */
export interface AvailabilityConfig {
  enable_buyer: boolean;
  enable_seller: boolean;
  nationality_field: "hidden" | "optional" | "required";
}

export interface SiteContent {
  home: HomeContent;
  about: AboutContent;
  why_choose_us: WhyChooseUsContent;
  md_profile: MdProfileContent;
  md_note: MdNoteContent;
  company: CompanyContent;
  legal_privacy: LegalContent;
  legal_terms: LegalContent;
  availability_config: AvailabilityConfig;
}

export type SiteContentKey = keyof SiteContent;

export const SITE_CONTENT_KEYS = [
  "home",
  "about",
  "why_choose_us",
  "md_profile",
  "md_note",
  "company",
  "legal_privacy",
  "legal_terms",
  "availability_config",
] as const satisfies readonly SiteContentKey[];

export function isSiteContentKey(key: string): key is SiteContentKey {
  return (SITE_CONTENT_KEYS as readonly string[]).includes(key);
}

// ─── Public API shapes ───────────────────────────────────────────────────────

export interface ContentItemResponse<K extends SiteContentKey = SiteContentKey> {
  key: K;
  value: SiteContent[K];
  updated_at: number;
}

export interface ContentAllResponse {
  items: Partial<SiteContent>;
}

/** An active agent as returned by `GET /agents`. */
export interface PublicAgent {
  id: string;
  name: string;
  position: string;
  specialization: string | null;
  languages: string[];
  phone: string | null;
  email: string | null;
  whatsapp: string | null;
  photo_url: string | null;
  bio: string | null;
}

export interface AgentsResponse {
  agents: PublicAgent[];
}

// ─── Placeholder seed ────────────────────────────────────────────────────────

export const DEFAULT_SITE_CONTENT: SiteContent = {
  home: {
    about_intro:
      "Momentum Living is a specialist in labour accommodation. We work with property owners, landlords, tenants, operators, management companies, investors, corporate clients and agents to find, place and manage workforce housing.",
    audiences: [
      "Property Owners",
      "Landlords",
      "Tenants",
      "Operators",
      "Management Companies",
      "Investors",
      "Corporate Clients",
      "Agents",
    ],
  },
  about: {
    who_we_are:
      "Momentum Living is a real-estate company focused on labour accommodation and labour camps. We bring together the people who own, operate and need workforce housing, and we handle each requirement with care, discretion and a clear process.",
    what_we_do: [
      { title: "Labour Camps", text: "Sourcing, leasing and sale of labour camps for companies and operators." },
      { title: "Labour Accommodation", text: "Workforce housing matched to headcount, location and budget." },
      { title: "Property Transactions", text: "Support through leasing, sale and purchase of accommodation assets." },
      { title: "Accommodation Opportunities", text: "Access to suitable opportunities once your requirements are understood." },
      { title: "Landlord Relationships", text: "Working with owners to position and place their accommodation." },
      { title: "Tenant Requirements", text: "Understanding what tenants need before any option is presented." },
      { title: "Management Company Relationships", text: "Partnering with management companies on supply and demand." },
      { title: "Corporate Accommodation Solutions", text: "Housing plans for companies moving or expanding a workforce." },
      { title: "Investment Opportunities", text: "Introducing investors to accommodation assets where applicable." },
    ],
    who_we_work_with: [
      { title: "Tenants", text: "Companies and contractors that need accommodation for their workforce." },
      { title: "Landlords", text: "Owners with labour accommodation to lease or sell." },
      { title: "Management Companies", text: "Operators that run and maintain accommodation on behalf of owners." },
      { title: "Property Owners", text: "Owners of land, buildings or camps suitable for workforce housing." },
      { title: "Operators", text: "Businesses that operate accommodation facilities day to day." },
      { title: "Investors", text: "Parties looking at accommodation assets as an investment." },
      { title: "Corporate Clients", text: "Organisations planning accommodation for projects and teams." },
      { title: "Agents", text: "Fellow professionals who want to collaborate on requirements." },
    ],
    why_us:
      "We focus on one market and we take the time to understand each requirement before presenting any option. Enquiries are handled confidentially, and every client works with a dedicated point of contact from first conversation to completion.",
    approach_steps: [
      { title: "Understand", text: "We listen to what you need: location, capacity, timing and budget." },
      { title: "Qualify", text: "We confirm the details so every option we present is relevant." },
      { title: "Match", text: "We match your requirements against suitable opportunities." },
      { title: "Connect", text: "We introduce the right parties and arrange information or viewings." },
      { title: "Negotiate", text: "We support both sides towards terms that work." },
      { title: "Complete", text: "We see the transaction through to completion." },
    ],
  },
  why_choose_us: {
    intro:
      "Momentum Living is built around one market: labour accommodation. Here is what that focus means for the people we work with.",
    features: [
      {
        title: "Specialist Knowledge",
        summary: "A focus on labour accommodation and workforce housing.",
        text: "Labour accommodation is our focus, not a side line. We understand the requirements behind workforce housing, from capacity and facilities to location and access.",
        icon: "compass",
      },
      {
        title: "Professional Network",
        summary: "Relationships across owners, operators and occupiers.",
        text: "We work with landlords, property owners, operators, management companies and agents, so a requirement can reach the right people quickly.",
        icon: "network",
      },
      {
        title: "Client-Focused Approach",
        summary: "Your requirements lead every conversation.",
        text: "We start with what you need and only present options that fit. You are not asked to browse; we do the matching for you.",
        icon: "users",
      },
      {
        title: "Efficient Process",
        summary: "A clear path from enquiry to completion.",
        text: "Understand, qualify, match, connect, negotiate, complete. Each step is defined, so you always know where your enquiry stands.",
        icon: "zap",
      },
      {
        title: "Market Understanding",
        summary: "Informed by day-to-day activity in the market.",
        text: "Our work across tenants, landlords and operators gives us a practical view of how the accommodation market is moving.",
        icon: "line-chart",
      },
      {
        title: "Trusted Relationships",
        summary: "Long-term relationships built on straight dealing.",
        text: "We aim to be the partner clients come back to, by being clear, responsive and honest about what is and is not a good fit.",
        icon: "handshake",
      },
      {
        title: "Confidentiality",
        summary: "Enquiries and owner details handled discreetly.",
        text: "Owner details and client requirements are kept confidential and shared only when both parties are ready to proceed.",
        icon: "shield",
      },
      {
        title: "Dedicated Support",
        summary: "A named agent for every enquiry.",
        text: "Every enquiry is assigned to an agent who stays with it, so you have one point of contact from first call to completion.",
        icon: "headset",
      },
    ],
  },
  md_profile: {
    name: "[MANAGING DIRECTOR NAME]",
    title: "Managing Director, Momentum Living",
    photo_key: "",
    biography: "[MANAGING DIRECTOR BIO]",
    experience: "[MANAGING DIRECTOR EXPERIENCE]",
    philosophy: "[LEADERSHIP PHILOSOPHY]",
    vision: "[VISION FOR MOMENTUM LIVING]",
    commitment_clients: "[COMMITMENT TO CLIENTS]",
    commitment_standards: "[COMMITMENT TO PROFESSIONAL STANDARDS]",
    market_vision: "[VISION FOR THE LABOUR ACCOMMODATION MARKET]",
  },
  md_note: {
    heading: "A Note From Our Managing Director",
    body: [
      "[MANAGING DIRECTOR'S MESSAGE: WELCOME TO MOMENTUM LIVING]",
      "[THE COMPANY'S PURPOSE]",
      "[WHY PROFESSIONAL LABOUR ACCOMMODATION MATTERS]",
      "[RELATIONSHIPS AND TRUST]",
      "[COMMITMENT TO CLIENTS, AND A WELCOME TO OWNERS, TENANTS, OPERATORS AND PARTNERS]",
    ].join("\n\n"),
    signature_name: "[MANAGING DIRECTOR NAME]",
  },
  company: {
    phone: "[COMPANY PHONE]",
    whatsapp: "[WHATSAPP NUMBER]",
    email: "[COMPANY EMAIL]",
    general_email: "[EMAIL]",
    sales_email: "[SALES EMAIL]",
    management_email: "[MANAGEMENT EMAIL]",
    address: "[OFFICE ADDRESS]",
    working_hours: "[WORKING HOURS]",
    socials: { linkedin: "", instagram: "", other: [] },
  },
  legal_privacy: {
    body_markdown: "[PRIVACY POLICY WORDING TO BE SUPPLIED BY MOMENTUM LIVING]",
    updated_on: "",
  },
  legal_terms: {
    body_markdown: "[TERMS AND CONDITIONS WORDING TO BE SUPPLIED BY MOMENTUM LIVING]",
    updated_on: "",
  },
  availability_config: {
    enable_buyer: false,
    enable_seller: false,
    nationality_field: "optional",
  },
};
