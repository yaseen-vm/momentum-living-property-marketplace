import { Link } from "react-router-dom";
import { ArrowRight, UserRound } from "lucide-react";
import { ContactCta } from "../../components/site/ContactCta";
import { PageSpinner } from "../../components/ui/Spinner";
import { publicMediaUrl } from "../../lib/api";
import { useContent } from "../../lib/content";
import { usePageMeta } from "../../lib/usePageMeta";

export default function ManagingDirectorPage() {
  usePageMeta({
    title: "Managing Director",
    description: "Meet the Managing Director of Momentum Living: background, leadership philosophy and vision.",
  });
  const { data: md, isPending } = useContent("md_profile");
  const photoUrl = publicMediaUrl(md.photo_key);

  const sections = [
    { heading: "Biography", text: md.biography },
    { heading: "Experience", text: md.experience },
    { heading: "Leadership Philosophy", text: md.philosophy },
    { heading: "Vision for Momentum Living", text: md.vision },
    { heading: "Commitment to Clients", text: md.commitment_clients },
    { heading: "Commitment to Professional Standards", text: md.commitment_standards },
    { heading: "Vision for the Labour Accommodation Market", text: md.market_vision },
  ];

  if (isPending) return <PageSpinner />;

  return (
    <>
      <section className="border-b border-charcoal-100 bg-navy-50/60">
        <div className="container-site grid gap-10 py-14 md:grid-cols-12 md:items-center md:py-20">
          <div className="md:col-span-4">
            <div className="mx-auto aspect-[4/5] w-full max-w-xs overflow-hidden rounded-2xl bg-navy-100 shadow-card">
              {photoUrl ? (
                <img src={photoUrl} alt={`Portrait of ${md.name}`} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-navy-400">
                  <UserRound className="h-20 w-20" aria-hidden />
                  <span className="text-xs font-semibold uppercase tracking-wider">[PORTRAIT]</span>
                </div>
              )}
            </div>
          </div>
          <div className="md:col-span-8">
            <span className="eyebrow">Leadership</span>
            <h1 className="heading-1 mt-4">{md.name}</h1>
            <p className="mt-4 text-lg font-medium text-charcoal-500">{md.title}</p>
            <span className="gold-rule mt-6" aria-hidden />
            <Link to="/managing-director/note" className="btn-secondary mt-8">
              Read a Note From the Managing Director <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container-site max-w-4xl space-y-12">
          {sections.map(({ heading, text }) => (
            <div key={heading} className="grid gap-4 md:grid-cols-12">
              <h2 className="heading-3 md:col-span-4">{heading}</h2>
              <p className="whitespace-pre-line leading-relaxed text-charcoal-600 md:col-span-8">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <ContactCta />
    </>
  );
}
