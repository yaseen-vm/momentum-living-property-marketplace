import { ContactCta } from "../../components/site/ContactCta";
import { PageHeader } from "../../components/site/PageHeader";
import { PageSpinner } from "../../components/ui/Spinner";
import { useContent } from "../../lib/content";
import { featureIcon } from "../../lib/featureIcons";
import { BRAND } from "../../lib/site";
import { usePageMeta } from "../../lib/usePageMeta";

export default function WhyChooseUsPage() {
  usePageMeta({
    title: "Why Choose Us",
    description:
      "Specialist knowledge, a professional network, confidentiality and dedicated support: why clients work with Momentum Living on labour accommodation.",
  });
  const { data, isPending } = useContent("why_choose_us");

  return (
    <>
      <PageHeader eyebrow="Why Choose Us" title={`Why Choose ${BRAND.name}`} lead={isPending ? undefined : data.intro} />

      <section className="section">
        <div className="container-site">
          {isPending ? (
            <PageSpinner />
          ) : (
            <ul className="grid gap-6 md:grid-cols-2">
              {data.features.map(({ title, text, icon }) => {
                const Icon = featureIcon(icon);
                return (
                  <li key={title} className="card flex gap-6">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-navy-50">
                      <Icon className="h-6 w-6 text-gold-600" aria-hidden />
                    </span>
                    <div>
                      <h2 className="heading-3">{title}</h2>
                      <p className="mt-3 leading-relaxed text-charcoal-600">{text}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      <ContactCta />
    </>
  );
}
