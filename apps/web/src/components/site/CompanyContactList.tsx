import { Building2, Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { CompanyContent } from "@momentum/shared";
import { mailHref, telHref, whatsappHref } from "../../lib/contact";

interface ContactItem {
  icon: LucideIcon;
  label: string;
  value: string;
  href: string | null;
  external?: boolean;
}

/** All eight company contact fields (spec §10), in display order. */
export function companyContactItems(company: CompanyContent): ContactItem[] {
  return [
    { icon: Phone, label: "Phone", value: company.phone, href: telHref(company.phone) },
    { icon: MessageCircle, label: "WhatsApp", value: company.whatsapp, href: whatsappHref(company.whatsapp), external: true },
    { icon: Mail, label: "Email", value: company.email, href: mailHref(company.email) },
    { icon: Mail, label: "General enquiries", value: company.general_email, href: mailHref(company.general_email) },
    { icon: Mail, label: "Sales", value: company.sales_email, href: mailHref(company.sales_email) },
    { icon: Building2, label: "Management", value: company.management_email, href: mailHref(company.management_email) },
    { icon: MapPin, label: "Office", value: company.address, href: null },
    { icon: Clock, label: "Working hours", value: company.working_hours, href: null },
  ];
}

interface CompanyContactListProps {
  company: CompanyContent;
  /** Only the primary lines (phone, WhatsApp, email, office, hours), e.g. for compact blocks. */
  compact?: boolean;
}

/** Labelled company contact details. Placeholders render as text, never as links. */
export function CompanyContactList({ company, compact = false }: CompanyContactListProps) {
  const items = companyContactItems(company).filter(
    (item) => !compact || !["General enquiries", "Sales", "Management"].includes(item.label)
  );

  return (
    <dl className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
      {items.map(({ icon: Icon, label, value, href, external }) => (
        <div key={label} className="flex items-start gap-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy-50 text-gold-600">
            <Icon className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <dt className="text-xs font-semibold uppercase tracking-wider text-charcoal-400">{label}</dt>
            <dd className="mt-1 break-words font-medium text-navy-900">
              {href ? (
                <a
                  href={href}
                  {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  className="hover:text-gold-700"
                >
                  {value}
                </a>
              ) : (
                value
              )}
            </dd>
          </div>
        </div>
      ))}
    </dl>
  );
}
