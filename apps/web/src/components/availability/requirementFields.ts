import { PROPERTY_TYPES, PROPERTY_TYPE_LABELS, TIMELINES, TIMELINE_LABELS } from "@momentum/shared";
import type { UserType } from "@momentum/shared";

export interface Option {
  value: string;
  label: string;
}

interface BaseField {
  name: string;
  label: string;
  required?: boolean;
  hint?: string;
  /** Spans both columns of the form grid. */
  wide?: boolean;
}

export type FieldDef =
  | (BaseField & { kind: "locations" })
  | (BaseField & { kind: "facilities" })
  | (BaseField & { kind: "number"; unit?: string })
  | (BaseField & { kind: "money" })
  | (BaseField & { kind: "date" })
  | (BaseField & { kind: "select"; options: Option[] })
  | (BaseField & { kind: "radio"; options: Option[] })
  | (BaseField & { kind: "text"; placeholder?: string })
  | (BaseField & { kind: "textarea"; placeholder?: string });

export interface FieldSection {
  title: string;
  fields: FieldDef[];
}

const propertyTypes: Option[] = PROPERTY_TYPES.map((t) => ({ value: t, label: PROPERTY_TYPE_LABELS[t] }));
const timelines: Option[] = TIMELINES.map((t) => ({ value: t, label: TIMELINE_LABELS[t] }));
const pricePeriods: Option[] = [
  { value: "year", label: "Per year" },
  { value: "month", label: "Per month" },
];

const other: FieldDef = {
  kind: "textarea",
  name: "other",
  label: "Other requirements",
  wide: true,
  placeholder: "Anything else we should know",
};

/** Step 3 form per user type (spec §16). Field names match the shared Zod schemas. */
export const REQUIREMENT_SECTIONS: Record<UserType, FieldSection[]> = {
  tenant: [
    {
      title: "Location",
      fields: [
        { kind: "locations", name: "location", label: "Required location", wide: true, hint: "Leave empty for anywhere in the UAE." },
        { kind: "text", name: "preferred_area", label: "Preferred area", wide: true, placeholder: "e.g. near Jebel Ali Free Zone" },
      ],
    },
    {
      title: "Capacity",
      fields: [
        { kind: "number", name: "occupants", label: "Number of occupants", required: true, unit: "persons" },
        { kind: "number", name: "beds", label: "Beds required", unit: "beds" },
        { kind: "number", name: "rooms", label: "Rooms required", unit: "rooms" },
        { kind: "select", name: "property_type", label: "Accommodation type", options: propertyTypes },
      ],
    },
    {
      title: "Timing and budget",
      fields: [
        { kind: "date", name: "move_in_date", label: "Move-in date" },
        { kind: "number", name: "contract_months", label: "Contract duration", unit: "months" },
        { kind: "money", name: "budget_min", label: "Budget from" },
        { kind: "money", name: "budget_max", label: "Budget up to" },
        { kind: "radio", name: "budget_period", label: "Budget is", options: pricePeriods, wide: true },
      ],
    },
    {
      title: "Facilities and access",
      fields: [
        { kind: "facilities", name: "facilities", label: "Facilities required", wide: true },
        {
          kind: "select",
          name: "parking",
          label: "Parking",
          options: [
            { value: "none", label: "Not needed" },
            { value: "car", label: "Car parking" },
            { value: "bus", label: "Bus parking" },
            { value: "car_and_bus", label: "Car and bus parking" },
          ],
        },
        {
          kind: "select",
          name: "transport",
          label: "Transport",
          options: [
            { value: "required", label: "Transport required" },
            { value: "not_required", label: "Own transport" },
          ],
        },
        other,
      ],
    },
  ],

  landlord: [
    {
      title: "Property",
      fields: [
        { kind: "locations", name: "location", label: "Property location", wide: true },
        { kind: "select", name: "property_type", label: "Property type", required: true, options: propertyTypes },
        {
          kind: "select",
          name: "property_condition",
          label: "Property condition",
          options: [
            { value: "new", label: "New" },
            { value: "good", label: "Good" },
            { value: "fair", label: "Fair" },
            { value: "needs_renovation", label: "Needs renovation" },
          ],
        },
        { kind: "number", name: "capacity", label: "Capacity", required: true, unit: "persons" },
        { kind: "number", name: "rooms", label: "Number of rooms", unit: "rooms" },
        { kind: "number", name: "current_occupancy", label: "Current occupancy", unit: "persons" },
        { kind: "date", name: "availability_date", label: "Available from" },
      ],
    },
    {
      title: "Commercial",
      fields: [
        {
          kind: "radio",
          name: "preference",
          label: "Looking for",
          required: true,
          wide: true,
          options: [
            { value: "lease", label: "Lease" },
            { value: "sale", label: "Sale" },
            { value: "management", label: "Management" },
          ],
        },
        { kind: "money", name: "asking_price", label: "Asking price / rent" },
        {
          kind: "select",
          name: "price_period",
          label: "Price is",
          options: [...pricePeriods, { value: "total", label: "Total (sale)" }],
        },
        { kind: "text", name: "contract_preference", label: "Contract preference", wide: true, placeholder: "e.g. 3-year lease, fixed rent" },
      ],
    },
    {
      title: "Facilities",
      fields: [{ kind: "facilities", name: "facilities", label: "Facilities available", wide: true }, other],
    },
  ],

  management_company: [
    {
      title: "Your company",
      fields: [
        { kind: "text", name: "company_name", label: "Company name" },
        { kind: "number", name: "managed_capacity", label: "Capacity currently managed", unit: "persons" },
        { kind: "locations", name: "location", label: "Locations of interest", wide: true },
        { kind: "number", name: "capacity_min", label: "Required capacity", unit: "persons" },
      ],
    },
    {
      title: "Requirements",
      fields: [
        { kind: "textarea", name: "management_requirements", label: "Management requirements", wide: true },
        { kind: "textarea", name: "operational_requirements", label: "Operational requirements", wide: true },
        { kind: "textarea", name: "contract_requirements", label: "Contract requirements", wide: true },
        { ...other, label: "Other conditions" },
      ],
    },
  ],

  buyer: [
    {
      title: "What you want to buy",
      fields: [
        { kind: "locations", name: "location", label: "Location(s)", wide: true },
        { kind: "select", name: "property_type", label: "Property type", options: propertyTypes },
        { kind: "select", name: "timeline", label: "Timeline", options: timelines },
        { kind: "number", name: "capacity_min", label: "Capacity from", unit: "persons" },
        { kind: "number", name: "capacity_max", label: "Capacity up to", unit: "persons" },
        { kind: "money", name: "budget_min", label: "Budget from" },
        { kind: "money", name: "budget_max", label: "Budget up to" },
        other,
      ],
    },
  ],

  seller: [
    {
      title: "What you want to sell",
      fields: [
        { kind: "locations", name: "location", label: "Property location", wide: true },
        { kind: "select", name: "property_type", label: "Property type", required: true, options: propertyTypes },
        { kind: "select", name: "timeline", label: "Timeline", options: timelines },
        { kind: "number", name: "capacity", label: "Capacity", unit: "persons" },
        { kind: "money", name: "asking_price", label: "Asking price" },
        { kind: "facilities", name: "facilities", label: "Facilities", wide: true },
        { ...other, label: "Other details" },
      ],
    },
  ],
};

/** Form defaults per user type: enums with a default and empty lists. */
export function requirementDefaults(userType: UserType, companyName: string | null | undefined): Record<string, unknown> {
  const base: Record<string, unknown> = { emirates: [], location_slugs: [], facilities: [] };
  if (userType === "tenant") base["budget_period"] = "year";
  if (userType === "landlord") base["price_period"] = "year";
  if (userType === "management_company" && companyName) base["company_name"] = companyName;
  return base;
}
