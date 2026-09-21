import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowRight } from "lucide-react";
import { ContactCta } from "../components/site/ContactCta";
import { useContent } from "../lib/content";
import { featureIcon } from "../lib/featureIcons";
import { AVAILABILITY_PATH, BRAND } from "../lib/site";
import { usePageMeta } from "../lib/usePageMeta";

gsap.registerPlugin(ScrollTrigger);

function Diamond() {
  return (
    <svg className="mt-0.5 h-3 w-3 shrink-0 text-gold-400" viewBox="0 0 12 12" fill="currentColor" aria-hidden>
      <rect x="6" y="0" width="6" height="6" transform="rotate(45 6 6)" />
    </svg>
  );
}

interface SkeletonImageProps {
  src: string;
  alt: string;
  className?: string;
  loading?: "lazy" | "eager";
  style?: React.CSSProperties;
  skeletonBg?: string;
  fetchPriority?: "high" | "low" | "auto";
}

function SkeletonImage({
  src,
  alt,
  className = "",
  loading = "lazy",
  style = {},
  skeletonBg = "linear-gradient(90deg, #e2e8f0 0%, #cbd5e1 50%, #e2e8f0 100%)",
  fetchPriority
}: SkeletonImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    // Handle already cached/loaded images
    const img = imgRef.current;
    if (img?.complete && img.naturalWidth > 0) {
      setIsLoaded(true);
    }
  }, []);

  return (
    <div className="relative w-full h-full">
      {!isLoaded && !isError && (
        <div
          className="absolute inset-0"
          style={{
            animation: "shimmer 2s infinite linear",
            backgroundImage: skeletonBg,
            backgroundSize: "200% 100%",
          }}
        />
      )}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        className={`${className} transition-opacity duration-500 ${isLoaded ? "opacity-100" : "opacity-0"}`}
        loading={loading}
        decoding="async"
        style={style}
        onLoad={() => setIsLoaded(true)}
        onError={() => setIsError(true)}
        {...(fetchPriority && { fetchpriority: fetchPriority })}
      />
    </div>
  );
}

// Strict no-listing rule (spec §27): this page must never link to inventory,
// show prices/counts or use "browse" CTAs. The only way in is AVAILABILITY.
export default function Landing() {
  const heroRef = useRef<HTMLElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const { data: home } = useContent("home");
  const { data: whyChoose } = useContent("why_choose_us");

  usePageMeta({
    description:
      "Momentum Living specialises in labour accommodation, labour camps and professional real-estate solutions in the UAE.",
  });

  // Preload critical images in priority order
  useEffect(() => {
    // High priority - above fold and first scroll
    const criticalImages = [
      "/images/professional_accommodation_1789645786277.jpg",
      "/images/construction_buildings_sunset_1789645890123.jpg",
    ];

    // Medium priority - mid page
    const mediumImages = [
      "/images/office_buildings_modern_1789645950789.jpg",
      "/images/workforce_camp_exterior_1789646010456.jpg",
      "/images/dining_area_1789646040123.png",
      "/images/dubai_commercial_land_1789645806536.jpg",
    ];

    // Load critical first
    const criticalPromises = criticalImages.map((src) => {
      return new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => resolve();
        img.src = src;
      });
    });

    // Then load medium priority
    Promise.all(criticalPromises).then(() => {
      mediumImages.forEach((src) => {
        const img = new Image();
        img.src = src;
      });

      if (window.ScrollTrigger) {
        setTimeout(() => window.ScrollTrigger.refresh(), 100);
      }
    });
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".hero-reveal", { y: 24, opacity: 0, duration: 0.8, stagger: 0.12, ease: "power3.out" });
      gsap.from(".hero-img", { scale: 1.04, opacity: 0, duration: 1.1, ease: "power2.out" });

      gsap.utils.toArray<HTMLElement>(".scroll-img").forEach((img) => {
        gsap.fromTo(
          img,
          { y: 0, force3D: true },
          {
            y: -30,
            ease: "none",
            force3D: true,
            scrollTrigger: {
              trigger: img.closest("section"),
              start: "top bottom",
              end: "bottom top",
              scrub: true,
              invalidateOnRefresh: true,
            },
          },
        );
      });

      gsap.utils.toArray<HTMLElement>(".scroll-reveal").forEach((el) => {
        gsap.from(el, {
          y: 40,
          opacity: 0,
          duration: 0.9,
          ease: "power3.out",
          scrollTrigger: {
            trigger: el,
            start: "top 85%",
            toggleActions: "play none none none",
            once: true,
          },
        });
      });

      gsap.utils.toArray<HTMLElement>(".scroll-reveal-stagger").forEach((group) => {
        const children = group.querySelectorAll(".stagger-child");
        gsap.from(children, {
          y: 50,
          opacity: 0,
          duration: 0.7,
          stagger: 0.15,
          ease: "power3.out",
          scrollTrigger: {
            trigger: group,
            start: "top 80%",
            toggleActions: "play none none none",
            once: true,
          },
        });
      });

      gsap.utils.toArray<HTMLElement>(".parallax-bg").forEach((img) => {
        gsap.fromTo(
          img,
          { yPercent: -5, force3D: true },
          {
            yPercent: 5,
            ease: "none",
            force3D: true,
            scrollTrigger: {
              trigger: img.closest("section"),
              start: "top bottom",
              end: "bottom top",
              scrub: true,
              invalidateOnRefresh: true,
            },
          },
        );
      });

      // Initial refresh
      ScrollTrigger.refresh();

      // Final refresh after everything settles
      const finalRefresh = setTimeout(() => {
        ScrollTrigger.refresh();
      }, 500);

      return () => clearTimeout(finalRefresh);
    }, pageRef);

    // Window load handler for final adjustments
    const handleLoad = () => {
      setTimeout(() => {
        ScrollTrigger.refresh();
      }, 100);
    };

    window.addEventListener("load", handleLoad);

    return () => {
      ctx.revert();
      window.removeEventListener("load", handleLoad);
    };
  }, []);

  return (
    <div ref={pageRef}>
      {/* ── Hero ── */}
      <section ref={heroRef} className="relative isolate overflow-hidden bg-navy-900">
        <img
          src="/images/professional_accommodation_1789645786277.jpg"
          alt="Professionally managed workforce accommodation"
          className="hero-img absolute inset-0 -z-10 h-full w-full object-cover"
          loading="eager"
          fetchpriority="high"
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

      {/* ── The Company — content left, image right ── */}
      <section className="overflow-hidden" style={{ transform: "translate3d(0,0,0)" }}>
        <div className="grid md:grid-cols-2">
          <div className="scroll-reveal flex flex-col justify-center px-6 py-16 sm:px-10 md:py-24 lg:py-32 lg:pl-[max(2rem,calc((100vw-1280px)/2+2rem))] lg:pr-16">
            <div className="flex items-center gap-3">
              <span className="block h-px w-8 bg-gold-400" aria-hidden />
              <span className="eyebrow">The Company</span>
            </div>
            <h2 className="mt-6 font-serif text-3xl leading-[1.15] text-navy-900 md:text-4xl lg:text-[2.75rem]">
              A specialist real-estate company focused on labour accommodation.
            </h2>
            <p className="mt-6 text-base leading-relaxed text-charcoal-400 md:text-lg">
              {home.about_intro || "Momentum Living connects and works with property owners, landlords, tenants, operators, management companies, investors, corporate clients and real-estate agents — bringing professionalism, relationships and market knowledge to every transaction."}
            </p>

            <ul className="mt-10 grid grid-cols-2 gap-x-8 gap-y-3">
              {["Property Owners", "Landlords", "Tenants", "Operators", "Management Companies", "Investors", "Corporate Clients", "Real-estate Agents"].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm font-medium text-navy-800">
                  <Diamond />
                  {item}
                </li>
              ))}
            </ul>

            <div className="mt-10">
              <Link
                to="/about"
                className="group inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-navy-800 transition-colors hover:text-gold-600"
              >
                Discover Momentum Living
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>

          <div className="relative min-h-[400px] overflow-hidden md:min-h-[600px]" style={{ transform: "translate3d(0,0,0)", contain: "layout style paint" }}>
            <SkeletonImage
              src="/images/construction_buildings_sunset_1789645890123.jpg"
              alt="Modern workforce accommodation facility"
              className="scroll-img absolute inset-0 h-[120%] w-full object-cover"
              loading="eager"
              style={{ transform: "translate3d(0,0,0)", backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
            />
          </div>
        </div>
      </section>

      {/* ── Accommodation Excellence — image left, content right ── */}
      <section className="overflow-hidden bg-navy-50/40" style={{ transform: "translate3d(0,0,0)" }}>
        <div className="grid md:grid-cols-2">
          <div className="relative order-2 min-h-[400px] overflow-hidden md:order-1 md:min-h-[600px]" style={{ transform: "translate3d(0,0,0)", contain: "layout style paint" }}>
            <SkeletonImage
              src="/images/chimney_building_sideview_1789645920456.jpg"
              alt="Premium interior living quarters"
              className="scroll-img absolute inset-0 h-[120%] w-full object-cover"
              loading="lazy"
              style={{ transform: "translate3d(0,0,0)", backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
            />
          </div>

          <div className="scroll-reveal order-1 flex flex-col justify-center px-6 py-16 sm:px-10 md:order-2 md:py-24 lg:py-32 lg:pl-16 lg:pr-[max(2rem,calc((100vw-1280px)/2+2rem))]">
            <div className="flex items-center gap-3">
              <span className="block h-px w-8 bg-gold-400" aria-hidden />
              <span className="eyebrow">Our Standards</span>
            </div>
            <h2 className="mt-6 font-serif text-3xl leading-[1.15] text-navy-900 md:text-4xl lg:text-[2.75rem]">
              Purpose-built for the modern workforce.
            </h2>
            <p className="mt-6 text-base leading-relaxed text-charcoal-400 md:text-lg">
              Every facility we manage is designed around the people who live there — from ventilation
              and safety systems to communal spaces and amenities, ensuring the highest standards
              of comfort and compliance.
            </p>

            <ul className="mt-10 grid grid-cols-2 gap-x-8 gap-y-3">
              {["Mohre Compliant", "Ejari Certified", "24/7 Management", "Fire & Safety Systems", "Scalable Capacity", "Strategic Locations", "Modern Amenities", "Secure Access"].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm font-medium text-navy-800">
                  <Diamond />
                  {item}
                </li>
              ))}
            </ul>

            <div className="mt-10">
              <Link
                to={AVAILABILITY_PATH}
                className="group inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-navy-800 transition-colors hover:text-gold-600"
              >
                Check Availability
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Commercial Spaces — full-bleed parallax ── */}
      <section className="relative isolate overflow-hidden" style={{ transform: "translate3d(0,0,0)" }}>
        <div className="absolute inset-0 -z-10 overflow-hidden" style={{ transform: "translate3d(0,0,0)", contain: "layout style paint" }}>
          <SkeletonImage
            src="/images/office_buildings_modern_1789645950789.jpg"
            alt="Commercial real estate in Dubai"
            className="parallax-bg h-[120%] w-full object-cover"
            loading="eager"
            style={{ transform: "translate3d(0,0,0)", backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
            skeletonBg="linear-gradient(90deg, #1e3a52 0%, #2d4a62 50%, #1e3a52 100%)"
          />
        </div>
        <div className="absolute inset-0 -z-10 bg-navy-950/65" />

        <div className="container-site py-24 md:py-32 lg:py-40">
          <div className="scroll-reveal max-w-2xl">
            <div className="flex items-center gap-3">
              <span className="block h-px w-8 bg-gold-400" aria-hidden />
              <span className="eyebrow text-gold-300">Commercial Properties</span>
            </div>
            <h2 className="mt-6 font-serif text-3xl leading-[1.15] text-white md:text-4xl lg:text-[2.75rem]">
              Strategic commercial spaces across the Emirates.
            </h2>
            <p className="mt-6 text-base leading-relaxed text-navy-100 md:text-lg">
              From warehouses and open yards to labour camps and industrial land, we connect businesses
              with the commercial spaces they need to operate and grow across Dubai, Abu Dhabi, Sharjah
              and the Northern Emirates.
            </p>

            <ul className="mt-10 grid grid-cols-2 gap-x-8 gap-y-3">
              {["Warehouses", "Labour Camps", "Open Yards", "Industrial Land", "Commercial Offices", "Mixed-use Facilities"].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm font-medium text-white/90">
                  <Diamond />
                  {item}
                </li>
              ))}
            </ul>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8">
              <Link to={AVAILABILITY_PATH} className="btn-availability">
                Explore Availability <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/agents"
                className="group inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/80 transition-colors hover:text-gold-300"
              >
                Speak to a Specialist
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Why Choose Us ── */}
      <section className="section bg-navy-50/60">
        <div className="container-site">
          <div className="scroll-reveal max-w-2xl">
            <div className="flex items-center gap-3">
              <span className="block h-px w-8 bg-gold-400" aria-hidden />
              <span className="eyebrow">Why Momentum Living</span>
            </div>
            <h2 className="mt-6 font-serif text-3xl leading-[1.15] text-navy-900 md:text-4xl lg:text-[2.75rem]">
              Why choose Momentum Living.
            </h2>
          </div>
          <ul className="scroll-reveal-stagger mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {whyChoose.features.map(({ title, summary, icon }) => {
              const Icon = featureIcon(icon);
              return (
                <li key={title} className="stagger-child card">
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

      {/* ── Spaces Showcase — image grid with staggered reveal ── */}
      <section className="section">
        <div className="container-site">
          <div className="scroll-reveal max-w-2xl">
            <div className="flex items-center gap-3">
              <span className="block h-px w-8 bg-gold-400" aria-hidden />
              <span className="eyebrow">Our Spaces</span>
            </div>
            <h2 className="mt-6 font-serif text-3xl leading-[1.15] text-navy-900 md:text-4xl lg:text-[2.75rem]">
              Spaces designed to perform.
            </h2>
            <p className="mt-6 text-base leading-relaxed text-charcoal-400 md:text-lg">
              Whether it is a fully fitted labour camp, a temperature-controlled warehouse, or a
              serviced office, every space in our portfolio is maintained to international standards.
            </p>
          </div>

          <div className="scroll-reveal-stagger mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="stagger-child group relative overflow-hidden rounded-xl">
              <div className="aspect-[4/3] overflow-hidden" style={{ transform: "translate3d(0,0,0)", contain: "layout style paint" }}>
                <SkeletonImage
                  src="/images/workforce_camp_exterior_1789646010456.jpg"
                  alt="Outdoor recreation area"
                  className="scroll-img h-[120%] w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="eager"
                  style={{ transform: "translate3d(0,0,0)", backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
                />
              </div>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy-950/80 to-transparent p-6 pt-16">
                <h3 className="font-serif text-lg text-white">Recreation Areas</h3>
                <p className="mt-1 text-sm text-navy-200">Open spaces for rest and wellbeing</p>
              </div>
            </div>

            <div className="stagger-child group relative overflow-hidden rounded-xl">
              <div className="aspect-[4/3] overflow-hidden" style={{ transform: "translate3d(0,0,0)", contain: "layout style paint" }}>
                <SkeletonImage
                  src="/images/dining_area_1789646040123.png"
                  alt="Modern kitchen and dining facility"
                  className="scroll-img h-[120%] w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="eager"
                  style={{ transform: "translate3d(0,0,0)", backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
                />
              </div>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy-950/80 to-transparent p-6 pt-16">
                <h3 className="font-serif text-lg text-white">Dining Facilities</h3>
                <p className="mt-1 text-sm text-navy-200">Hygienic, well-equipped communal kitchens</p>
              </div>
            </div>

            <div className="stagger-child group relative overflow-hidden rounded-xl sm:col-span-2 lg:col-span-1">
              <div className="aspect-[4/3] overflow-hidden" style={{ transform: "translate3d(0,0,0)", contain: "layout style paint" }}>
                <SkeletonImage
                  src="/images/dubai_commercial_land_1789645806536.jpg"
                  alt="Commercial land and industrial yard"
                  className="scroll-img h-[120%] w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="eager"
                  style={{ transform: "translate3d(0,0,0)", backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
                />
              </div>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy-950/80 to-transparent p-6 pt-16">
                <h3 className="font-serif text-lg text-white">Industrial Yards</h3>
                <p className="mt-1 text-sm text-navy-200">Secure, accessible commercial land</p>
              </div>
            </div>
          </div>

          <div className="scroll-reveal mt-12 text-center">
            <Link to="/agents" className="btn-primary">
              Talk to Our Team <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <ContactCta />
    </div>
  );
}
