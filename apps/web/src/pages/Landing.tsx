import { Link } from "react-router-dom";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ArrowRight } from "lucide-react";
import { ContactCta } from "../components/site/ContactCta";
import { useContent } from "../lib/content";
import { featureIcon } from "../lib/featureIcons";
import { AVAILABILITY_PATH, BRAND } from "../lib/site";
import { usePageMeta } from "../lib/usePageMeta";

// Strict no-listing rule (spec §27): this page must never link to inventory,
// show prices/counts or use "browse" CTAs. The only way in is AVAILABILITY.
export default function Landing() {
  const heroRef = useRef<HTMLElement>(null);
  const { data: home } = useContent("home");
  const { data: whyChoose } = useContent("why_choose_us");

  usePageMeta({
    description:
      "Momentum Living specialises in labour accommodation, labour camps and professional real-estate solutions in the UAE.",
  });

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".hero-reveal", { y: 24, opacity: 0, duration: 0.8, stagger: 0.12, ease: "power3.out" });
      gsap.from(".hero-img", { scale: 1.04, opacity: 0, duration: 1.1, ease: "power2.out" });
    }, heroRef);
    return () => ctx.revert();
  }, []);

  return (
    <>
      <section ref={heroRef} className="relative isolate overflow-hidden bg-navy-900">
        <img
          src="/images/professional_accommodation_1789645786277.jpg"
          alt="Professionally managed workforce accommodation"
          className="hero-img absolute inset-0 -z-10 h-full w-full object-cover"
        />
        <div className="absolute inset-0 -z-10 bg-navy-950/75 md:bg-transparent md:bg-gradient-to-r md:from-navy-950/90 md:via-navy-950/70 md:to-navy-950/20" />

        <div className="container-site flex min-h-[560px] flex-col justify-center py-20 md:min-h-[640px] md:py-28">
          <div className="max-w-2xl">
            <span className="hero-reveal eyebrow block text-gold-300">{BRAND.domain}</span>
            <h1 className="hero-reveal heading-1 mt-5 text-white">
              Momentum Living: Moving Labour Accommodation Forward.
            </h1>
            <p className="hero-reveal mt-6 max-w-xl text-base leading-relaxed text-navy-100 md:text-lg">
              Specialists in labour accommodation, property opportunities and professional real-estate
              solutions.
            </p>

            <div className="hero-reveal mt-10 flex flex-col gap-3 sm:flex-row">
              <Link to="/about" className="btn bg-white text-navy-900 hover:bg-navy-50">
                Learn About Momentum Living
              </Link>
              <Link to="/agents" className="btn-on-dark">
                Speak to an Agent
              </Link>
            </div>

            <div className="hero-reveal mt-10 flex flex-col gap-3 border-t border-white/15 pt-8 sm:flex-row sm:items-center sm:gap-6">
              <Link to={AVAILABILITY_PATH} className="btn-availability px-8 py-4">
                Availability <ArrowRight className="h-4 w-4" />
              </Link>
              <p className="text-sm text-navy-200">
                Tell us what you need and we will match you with suitable opportunities.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container-site grid gap-12 md:grid-cols-12">
          <div className="md:col-span-7">
            <span className="eyebrow">About the company</span>
            <h2 className="heading-2 mt-4">A specialist in labour accommodation</h2>
            <span className="gold-rule mt-6" aria-hidden />
            <p className="lead mt-6">{home.about_intro}</p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Link to="/about" className="btn-primary">
                Discover Momentum Living <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/contact" className="btn-secondary">
                Contact Us
              </Link>
            </div>
          </div>
          <div className="md:col-span-5">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-charcoal-400">Who we work with</h3>
            <ul className="mt-5 flex flex-wrap gap-2">
              {home.audiences.map((audience) => (
                <li
                  key={audience}
                  className="rounded-full border border-charcoal-100 bg-navy-50/60 px-4 py-2 text-sm font-medium text-navy-800"
                >
                  {audience}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="section bg-navy-50/60">
        <div className="container-site">
          <div className="max-w-2xl">
            <span className="eyebrow">Why Momentum Living</span>
            <h2 className="heading-2 mt-4">Why Choose Momentum Living</h2>
            <span className="gold-rule mt-6" aria-hidden />
          </div>
          <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {whyChoose.features.map(({ title, summary, icon }) => {
              const Icon = featureIcon(icon);
              return (
                <li key={title} className="card">
                  <Icon className="h-7 w-7 text-gold-500" aria-hidden />
                  <h3 className="mt-5 font-serif text-lg text-navy-900">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-charcoal-500">{summary}</p>
                </li>
              );
            })}
          </ul>
          <div className="mt-12">
            <Link to="/why-choose-us" className="btn-secondary">
              Learn More <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <ContactCta />
    </>
  );
}
