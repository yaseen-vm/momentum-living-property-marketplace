import { Link } from "react-router-dom";
import { ArrowRight, MessageCircle } from "lucide-react";
import { PageHeader } from "../../components/site/PageHeader";
import { CompanyContactList } from "../../components/site/CompanyContactList";
import { useChatWithAgent } from "../../components/site/ChatWithAgent";
import { PageSpinner } from "../../components/ui/Spinner";
import { useContent } from "../../lib/content";
import { AVAILABILITY_PATH, BRAND } from "../../lib/site";
import { usePageMeta } from "../../lib/usePageMeta";

export default function AboutPage() {
  usePageMeta({
    title: "About Us",
    description:
      "Momentum Living is a real-estate company specialising in labour accommodation and labour camps: who we are, what we do, who we work with and how we work.",
  });
  const { data: about, isPending } = useContent("about");
  const { data: company } = useContent("company");
  const { openChat } = useChatWithAgent();

  return (
    <>
      <PageHeader eyebrow="About Us" title={`About ${BRAND.name}`} lead="Labour accommodation and real-estate solutions." />

      {isPending ? (
        <PageSpinner />
      ) : (
        <>
          <section className="section">
            <div className="container-site grid gap-10 md:grid-cols-12">
              <h2 className="heading-2 md:col-span-4">Who We Are</h2>
              <p className="lead md:col-span-8">{about.who_we_are}</p>
            </div>
          </section>

          <section className="section bg-navy-50/60">
            <div className="container-site">
              <h2 className="heading-2">What We Do</h2>
              <span className="gold-rule mt-6" aria-hidden />
              <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {about.what_we_do.map(({ title, text }) => (
                  <li key={title} className="card">
                    <h3 className="font-serif text-lg text-navy-900">{title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-charcoal-500">{text}</p>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="section">
            <div className="container-site">
              <h2 className="heading-2">Who We Work With</h2>
              <span className="gold-rule mt-6" aria-hidden />
              <ul className="mt-12 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
                {about.who_we_work_with.map(({ title, text }) => (
                  <li key={title} className="border-l-2 border-gold-400 pl-5">
                    <h3 className="font-semibold text-navy-900">{title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-charcoal-500">{text}</p>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="section bg-navy-900">
            <div className="container-site grid gap-10 md:grid-cols-12">
              <h2 className="heading-2 text-white md:col-span-4">Why {BRAND.name}</h2>
              <div className="md:col-span-8">
                <p className="text-base leading-relaxed text-navy-100 md:text-lg">{about.why_us}</p>
                <Link to="/why-choose-us" className="btn-on-dark mt-8">
                  Why Choose Us <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </section>

          <section className="section">
            <div className="container-site">
              <h2 className="heading-2">Our Approach</h2>
              <span className="gold-rule mt-6" aria-hidden />
              <ol className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                {about.approach_steps.map(({ title, text }, i) => (
                  <li key={title} className="relative rounded-xl border border-charcoal-100 p-6">
                    <span className="font-serif text-3xl text-gold-400">{String(i + 1).padStart(2, "0")}</span>
                    <h3 className="mt-3 font-semibold text-navy-900">{title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-charcoal-500">{text}</p>
                  </li>
                ))}
              </ol>
            </div>
          </section>
        </>
      )}

      {/* Spec §10: the contact block on About Us must be extremely prominent. */}
      <section id="contact" className="section border-t-4 border-gold-400 bg-navy-50/60">
        <div className="container-site">
          <div className="rounded-2xl bg-white p-8 shadow-card md:p-12">
            <div className="grid gap-12 lg:grid-cols-12">
              <div className="lg:col-span-5">
                <span className="eyebrow">Get in touch</span>
                <h2 className="heading-2 mt-4">Contact {BRAND.name}</h2>
                <p className="lead mt-6">
                  Speak to an agent about your requirement, or start an enquiry and we will match you with suitable
                  opportunities.
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
                  <button type="button" onClick={() => openChat()} className="btn-primary">
                    <MessageCircle className="h-4 w-4" /> Chat With an Agent
                  </button>
                  <Link to={AVAILABILITY_PATH} className="btn-availability">
                    Start an Enquiry <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
              <div className="lg:col-span-7">
                <CompanyContactList company={company} compact />
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
