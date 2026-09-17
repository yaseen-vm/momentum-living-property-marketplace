import { Link } from "react-router-dom";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  KeyRound,
  MapPinned,
  Search,
  ShieldCheck,
  Users,
  Warehouse,
} from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

const solutions = [
  {
    title: "Labour Accommodation",
    description:
      "Source rooms, floors, camps and sublease opportunities around your workforce requirements.",
    image: "/images/labour-accommodation.svg",
    alt: "Stylised labour accommodation building",
    href: "/listings?type=room",
    icon: Users,
  },
  {
    title: "Warehouses",
    description:
      "Find commercial warehouse space by type, area, location, budget and operational requirements.",
    image: "/images/warehouse.svg",
    alt: "Stylised commercial warehouse",
    href: "/listings?type=warehouse",
    icon: Warehouse,
  },
  {
    title: "Land",
    description:
      "Connect land buyers and sellers around location, area, tenure and commercial requirements.",
    image: "/images/land.svg",
    alt: "Stylised commercial development land",
    href: "/listings?type=plot",
    icon: MapPinned,
  },
];

const process = [
  {
    step: "01",
    title: "Tell us what you need",
    description:
      "Search approved listings or share the property requirement that matters to your business.",
    icon: ClipboardCheck,
  },
  {
    step: "02",
    title: "Verify and qualify",
    description:
      "Mobile verification and structured property details keep enquiries clear and actionable.",
    icon: ShieldCheck,
  },
  {
    step: "03",
    title: "Review suitable options",
    description:
      "For requirement-led requests, the workflow is designed to surface the best-fit options and connect the parties.",
    icon: CheckCircle2,
  },
];

export default function Landing() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".hero-reveal", {
        y: 36,
        opacity: 0,
        duration: 0.9,
        stagger: 0.12,
        ease: "power3.out",
      });

      gsap.from(".hero-visual", {
        scale: 1.04,
        opacity: 0,
        duration: 1.2,
        delay: 0.15,
        ease: "power3.out",
      });

      gsap.utils.toArray<HTMLElement>(".scroll-reveal").forEach((element) => {
        gsap.from(element, {
          scrollTrigger: {
            trigger: element,
            start: "top 84%",
            once: true,
          },
          y: 34,
          opacity: 0,
          duration: 0.75,
          ease: "power3.out",
        });
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className="min-h-screen overflow-hidden bg-white font-sans text-slate-950">
      <header className="border-b border-slate-200/80 bg-white/95 backdrop-blur">
        <nav className="mx-auto flex max-w-[1400px] items-center justify-between px-5 py-5 md:px-8">
          <Link to="/" className="flex items-baseline gap-1" aria-label="Momentum Living home">
            <span className="font-serif text-xl font-bold tracking-tight">Momentum</span>
            <span className="text-xl font-semibold tracking-tight">Living</span>
          </Link>

          <div className="hidden items-center gap-9 text-sm font-medium text-slate-600 md:flex">
            <a href="#solutions" className="transition-colors hover:text-slate-950">Solutions</a>
            <a href="#how-it-works" className="transition-colors hover:text-slate-950">How it works</a>
            <Link to="/listings" className="transition-colors hover:text-slate-950">Properties</Link>
            <Link to="/vendor/login" className="transition-colors hover:text-slate-950">List property</Link>
          </div>

          <Link
            to="/listings"
            className="rounded-full bg-[#17384f] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0f2b3c]"
          >
            Find a property
          </Link>
        </nav>
      </header>

      <main>
        <section className="mx-auto max-w-[1400px] px-4 pt-5 md:px-8 md:pt-7">
          <div className="relative min-h-[650px] overflow-hidden rounded-[2rem] bg-[#102c3e] shadow-2xl shadow-slate-900/10 md:min-h-[690px] md:rounded-[2.5rem]">
            <img
              src="/images/commercial-hero.svg"
              alt="Dubai commercial property landscape"
              className="hero-visual absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#102c3e] via-[#102c3e]/90 to-[#102c3e]/15" />
            <div className="relative z-10 flex min-h-[650px] max-w-3xl flex-col justify-center px-7 py-16 text-white md:min-h-[690px] md:px-16 md:py-20">
              <p className="hero-reveal mb-6 text-xs font-semibold uppercase tracking-[0.24em] text-[#a8c7c7]">
                Dubai commercial real estate
              </p>
              <h1 className="hero-reveal max-w-3xl font-serif text-5xl leading-[1.02] tracking-tight md:text-7xl">
                Property solutions built around your requirement.
              </h1>
              <p className="hero-reveal mt-7 max-w-2xl text-base leading-7 text-slate-200 md:text-lg">
                Momentum Living Real Estate L.L.C connects businesses, tenants, buyers, landlords and property managers through a structured property marketplace in Dubai.
              </p>
              <div className="hero-reveal mt-9 flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/listings"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
                >
                  Explore approved properties
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/vendor/login"
                  className="inline-flex items-center justify-center rounded-full border border-white/30 px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  List your property
                </Link>
              </div>
              <div className="hero-reveal mt-12 flex flex-wrap gap-x-7 gap-y-3 text-xs text-slate-300">
                <span className="inline-flex items-center gap-2"><BadgeCheck className="h-4 w-4 text-[#a8c7c7]" /> Approved listings</span>
                <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[#a8c7c7]" /> Verified participants</span>
                <span className="inline-flex items-center gap-2"><KeyRound className="h-4 w-4 text-[#a8c7c7]" /> Dubai brokerage</span>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1200px] px-5 py-24 md:px-8 md:py-32">
          <div className="scroll-reveal grid gap-8 md:grid-cols-[1.05fr_.95fr] md:items-end">
            <div>
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">A focused marketplace</p>
              <h2 className="max-w-3xl font-serif text-4xl leading-tight tracking-tight md:text-5xl">
                Commercial property, without the generic real-estate noise.
              </h2>
            </div>
            <p className="max-w-xl text-base leading-7 text-slate-600 md:justify-self-end">
              The platform is structured around the requirements in Momentum Living&apos;s brokerage workflow: labour accommodation, warehouses and land, with separate journeys for people looking for space and those with space available.
            </p>
          </div>

          <div id="solutions" className="mt-14 grid gap-5 md:grid-cols-3">
            {solutions.map((solution) => {
              const Icon = solution.icon;
              return (
                <Link
                  key={solution.title}
                  to={solution.href}
                  className="scroll-reveal group overflow-hidden rounded-3xl border border-slate-200 bg-white transition duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-xl hover:shadow-slate-900/5"
                >
                  <div className="aspect-[4/3] overflow-hidden bg-slate-100">
                    <img
                      src={solution.image}
                      alt={solution.alt}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                    />
                  </div>
                  <div className="p-7">
                    <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-800">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="font-serif text-2xl tracking-tight">{solution.title}</h3>
                    <p className="mt-3 min-h-[72px] text-sm leading-6 text-slate-600">{solution.description}</p>
                    <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-950">
                      Explore {solution.title.toLowerCase()}
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="bg-[#f4f6f5]">
          <div className="mx-auto grid max-w-[1200px] gap-14 px-5 py-24 md:grid-cols-[.85fr_1.15fr] md:px-8 md:py-28">
            <div className="scroll-reveal">
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Two sides of the market</p>
              <h2 className="font-serif text-4xl leading-tight tracking-tight md:text-5xl">Looking for space or bringing space to market?</h2>
              <p className="mt-6 max-w-lg text-base leading-7 text-slate-600">
                Momentum Living&apos;s workflow supports both sides: customers submit or search for a requirement, while landlords, management companies, agents and brokers can submit property availability for approval.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="scroll-reveal rounded-3xl bg-[#17384f] p-7 text-white">
                <Search className="mb-12 h-6 w-6 text-[#a8c7c7]" />
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a8c7c7]">I need property</p>
                <h3 className="mt-3 font-serif text-3xl">Tell us what your business needs.</h3>
                <p className="mt-4 text-sm leading-6 text-slate-200">Browse approved listings and move into a structured, verified enquiry journey.</p>
                <Link to="/listings" className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-white">Find property <ArrowRight className="h-4 w-4" /></Link>
              </div>
              <div className="scroll-reveal rounded-3xl border border-slate-200 bg-white p-7">
                <Building2 className="mb-12 h-6 w-6 text-slate-700" />
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">I have property</p>
                <h3 className="mt-3 font-serif text-3xl">Bring your available space to market.</h3>
                <p className="mt-4 text-sm leading-6 text-slate-600">Register as a vendor, complete verification and submit listings for admin approval.</p>
                <Link to="/vendor/login" className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-slate-950">List property <ArrowRight className="h-4 w-4" /></Link>
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="mx-auto max-w-[1200px] px-5 py-24 md:px-8 md:py-32">
          <div className="scroll-reveal mx-auto max-w-2xl text-center">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">How it works</p>
            <h2 className="font-serif text-4xl tracking-tight md:text-5xl">A clear path from requirement to connection.</h2>
          </div>
          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {process.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.step} className="scroll-reveal rounded-3xl border border-slate-200 p-7">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold tracking-[0.18em] text-slate-400">{item.step}</span>
                    <Icon className="h-5 w-5 text-slate-700" />
                  </div>
                  <h3 className="mt-16 font-serif text-2xl tracking-tight">{item.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{item.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mx-auto max-w-[1200px] px-5 pb-24 md:px-8 md:pb-32">
          <div className="scroll-reveal overflow-hidden rounded-[2rem] bg-[#17384f] p-8 text-white md:p-12">
            <div className="grid gap-10 md:grid-cols-[1.2fr_.8fr] md:items-center">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#a8c7c7]">Licensed in Dubai</p>
                <h2 className="mt-4 max-w-2xl font-serif text-4xl leading-tight tracking-tight md:text-5xl">Momentum Living Real Estate L.L.C</h2>
                <p className="mt-5 max-w-2xl text-sm leading-6 text-slate-200">
                  A Dubai real estate brokerage licensed for leasing property brokerage and real estate buying &amp; selling brokerage.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-1">
                <div className="rounded-2xl border border-white/15 bg-white/5 p-5">
                  <p className="text-xs uppercase tracking-[0.18em] text-[#a8c7c7]">Commercial licence</p>
                  <p className="mt-2 text-xl font-semibold">1606417</p>
                </div>
                <div className="rounded-2xl border border-white/15 bg-white/5 p-5">
                  <p className="text-xs uppercase tracking-[0.18em] text-[#a8c7c7]">Licensed activities</p>
                  <p className="mt-2 text-sm leading-5 text-slate-100">Leasing brokerage · Buying &amp; selling brokerage</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="contact" className="border-t border-slate-200 bg-white">
          <div className="mx-auto flex max-w-[1200px] flex-col gap-8 px-5 py-16 md:flex-row md:items-center md:justify-between md:px-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Start a conversation</p>
              <h2 className="mt-3 font-serif text-3xl tracking-tight md:text-4xl">Have a requirement or available property?</h2>
            </div>
            <div className="flex flex-col gap-2 text-sm text-slate-600 md:items-end">
              <a className="font-medium hover:text-slate-950" href="tel:+971563508466">+971 56 350 8466</a>
              <a className="font-medium hover:text-slate-950" href="mailto:momentumlivingllc@gmail.com">momentumlivingllc@gmail.com</a>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-[#102c3e] text-white">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-8 px-5 py-10 text-sm md:flex-row md:items-center md:justify-between md:px-8">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="font-serif text-xl font-bold">Momentum</span>
              <span className="text-xl font-semibold">Living</span>
            </div>
            <p className="mt-2 text-xs text-slate-400">Momentum Living Real Estate L.L.C · Dubai, UAE</p>
          </div>
          <div className="flex flex-wrap gap-6 text-slate-300">
            <Link to="/listings" className="hover:text-white">Properties</Link>
            <Link to="/vendor/login" className="hover:text-white">List property</Link>
            <Link to="/login" className="hover:text-white">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
