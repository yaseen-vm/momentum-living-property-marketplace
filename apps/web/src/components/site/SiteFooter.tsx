import { Link } from "react-router-dom";
import { Clock, Linkedin, Instagram, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { BrandLogo } from "./BrandLogo";
import {
  AVAILABILITY_PATH,
  BRAND,
  COMPANY_PLACEHOLDER,
  LEGAL_ITEMS,
  NAV_ITEMS,
  isPlaceholder,
} from "../../lib/site";

interface ContactLineProps {
  icon: LucideIcon;
  value: string;
  href: string;
}

/** Placeholders render as plain text so no fake tel:/mailto: link is ever produced. */
function ContactLine({ icon: Icon, value, href }: ContactLineProps) {
  const content = (
    <>
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-gold-400" aria-hidden />
      <span className="break-words">{value}</span>
    </>
  );
  return (
    <li>
      {isPlaceholder(value) ? (
        <span className="flex items-start gap-3">{content}</span>
      ) : (
        <a href={href} className="flex items-start gap-3 transition-colors hover:text-white">
          {content}
        </a>
      )}
    </li>
  );
}

export function SiteFooter() {
  const company = COMPANY_PLACEHOLDER;
  const whatsappDigits = company.whatsapp.replace(/\D/g, "");
  const socials = [
    { label: "LinkedIn", url: company.socials.linkedin, icon: Linkedin },
    { label: "Instagram", url: company.socials.instagram, icon: Instagram },
  ].filter((s) => !isPlaceholder(s.url));

  return (
    <footer className="bg-navy-950 text-navy-200">
      <div className="container-site pb-10 pt-16 md:pt-20">
        <div className="grid grid-cols-1 gap-12 border-b border-white/10 pb-14 md:grid-cols-12">
          <div className="md:col-span-4">
            <BrandLogo tone="light" />
            <p className="mt-6 max-w-xs text-sm leading-relaxed">{BRAND.tagline}</p>
            <Link to={AVAILABILITY_PATH} className="btn-availability mt-8">
              Availability
            </Link>
          </div>

          <div className="md:col-span-2">
            <h2 className="eyebrow mb-5 text-gold-400">Company</h2>
            <ul className="space-y-3 text-sm">
              {NAV_ITEMS.map(({ to, label }) => (
                <li key={to}>
                  <Link to={to} className="transition-colors hover:text-white">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-4">
            <h2 className="eyebrow mb-5 text-gold-400">Contact</h2>
            <ul className="space-y-3 text-sm">
              <ContactLine icon={Phone} value={company.phone} href={`tel:${company.phone.replace(/\s/g, "")}`} />
              <ContactLine icon={MessageCircle} value={company.whatsapp} href={`https://wa.me/${whatsappDigits}`} />
              <ContactLine icon={Mail} value={company.email} href={`mailto:${company.email}`} />
              <ContactLine icon={MapPin} value={company.address} href="/contact" />
              <li className="flex items-start gap-3">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-gold-400" aria-hidden />
                <span>{company.working_hours}</span>
              </li>
            </ul>
          </div>

          <div className="md:col-span-2">
            <h2 className="eyebrow mb-5 text-gold-400">Legal</h2>
            <ul className="space-y-3 text-sm">
              {LEGAL_ITEMS.map(({ to, label }) => (
                <li key={to}>
                  <Link to={to} className="transition-colors hover:text-white">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
            {socials.length > 0 && (
              <div className="mt-8 flex gap-3">
                {socials.map(({ label, url, icon: Icon }) => (
                  <a
                    key={label}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 transition-colors hover:border-gold-400 hover:text-white"
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        <p className="pt-8 text-xs text-navy-300">
          &copy; {new Date().getFullYear()} {BRAND.name}. All Rights Reserved.
        </p>
      </div>
    </footer>
  );
}
