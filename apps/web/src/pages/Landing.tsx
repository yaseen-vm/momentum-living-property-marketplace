import { Link, useNavigate } from "react-router-dom";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ShieldCheck,
  Building2,
  Map,
  Users,
  FileText,
  Smartphone,
  Search,
  CheckCircle2,
  ArrowRight,
  Mail,
  Phone,
} from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

export default function Landing() {
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Defer GSAP init by one frame so the browser has painted the layout.
    // Without this, ScrollTrigger calculates trigger positions before images
    // have their final heights, causing gsap.fromTo to leave elements at
    // opacity:0 permanently if the trigger fires at the wrong offset.
    let ctx: gsap.Context | undefined;

    const timer = setTimeout(() => {
      ctx = gsap.context(() => {
        gsap.from(".hero-text", {
          y: 50,
          opacity: 0,
          duration: 1,
          stagger: 0.2,
          ease: "power3.out",
        });

        gsap.from(".hero-img", {
          scale: 1.05,
          opacity: 0,
          duration: 1.2,
          delay: 0.3,
          ease: "power3.out",
        });

        const once = { once: true };

        gsap.fromTo(".trust-section",
          { y: 30, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.8, ease: "power3.out",
            scrollTrigger: { trigger: ".trust-section", start: "top 88%", ...once } }
        );

        gsap.fromTo(".category-card",
          { y: 20, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.6, stagger: 0.08, ease: "power3.out",
            scrollTrigger: { trigger: ".categories-section", start: "top 85%", ...once } }
        );

        gsap.fromTo(".step-item",
          { y: 30, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.6, stagger: 0.1, ease: "power3.out",
            scrollTrigger: { trigger: ".steps-section", start: "top 85%", ...once } }
        );

        gsap.fromTo(".mid-img-left",
          { x: -50, opacity: 0 },
          { x: 0, opacity: 1, duration: 1, ease: "power3.out",
            scrollTrigger: { trigger: ".mid-section", start: "top 80%", ...once } }
        );

        gsap.fromTo(".mid-img-right",
          { x: 50, opacity: 0 },
          { x: 0, opacity: 1, duration: 1, ease: "power3.out",
            scrollTrigger: { trigger: ".mid-section", start: "top 80%", ...once } }
        );

        gsap.fromTo(".mid-text",
          { y: 30, opacity: 0 },
          { y: 0, opacity: 1, duration: 1, delay: 0.2, ease: "power3.out",
            scrollTrigger: { trigger: ".mid-section", start: "top 80%", ...once } }
        );

        gsap.fromTo(".bottom-banner",
          { y: 40, opacity: 0 },
          { y: 0, opacity: 1, duration: 1, ease: "power3.out",
            scrollTrigger: { trigger: ".bottom-banner", start: "top 88%", ...once } }
        );

        gsap.fromTo(".contact-section",
          { y: 30, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.8, ease: "power3.out",
            scrollTrigger: { trigger: ".contact-section", start: "top 88%", ...once } }
        );
      }, containerRef);
    }, 50);

    return () => {
      clearTimeout(timer);
      ctx?.revert();
    };
  }, []);

  return (
    <div ref={containerRef} className="min-h-screen bg-white font-sans overflow-hidden text-slate-900">

      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-6 max-w-[1400px] mx-auto">
        <div className="text-xl font-bold italic font-serif">
          Momentum<span className="font-sans font-semibold not-italic">Living</span>
        </div>

        <div className="hidden md:flex items-center gap-10 text-sm text-slate-500 font-medium">
          <a href="#solutions" className="hover:text-black transition-colors">Solutions</a>
          <a href="#how-it-works" className="hover:text-black transition-colors">How It Works</a>
          <Link to="/vendor/login" className="hover:text-black transition-colors">List Property</Link>
          <a href="#contact" className="hover:text-black transition-colors">Get in Touch</a>
        </div>

        <Link
          to="/login"
          className="bg-black text-white px-7 py-3 rounded text-sm font-medium hover:bg-slate-800 transition-colors"
        >
          Sign In
        </Link>
      </nav>

      {/* Hero */}
      <section className="px-4 md:px-8 max-w-[1400px] mx-auto mt-4">
        <div className="bg-[#1D3B53] rounded-[2.5rem] flex flex-col md:flex-row overflow-hidden shadow-2xl shadow-blue-900/10">

          {/* Text side — fixed 55% so text never bleeds into the photo */}
          <div className="w-full md:w-[55%] p-12 md:p-20 flex flex-col justify-center text-white shrink-0">
            <span className="hero-text text-xs tracking-[0.25em] text-[#A6C0D2] mb-6 uppercase font-medium">
              Momentum Living Real Estate L.L.C — Dubai
            </span>

            <h1 className="hero-text text-4xl md:text-5xl lg:text-6xl font-serif leading-[1.1] mb-6">
              Commercial Real Estate Solutions in Dubai
            </h1>

            <p className="hero-text text-[#A6C0D2] text-base max-w-md mb-10 leading-relaxed">
              Connecting businesses with suitable labour accommodation, warehouse, and land opportunities across leasing and buying/selling.
            </p>

            {/* Matching flow strip */}
            <div className="hero-text flex items-center gap-2 text-xs text-[#A6C0D2] mb-10 flex-wrap">
              {["Requirement", "Qualification", "Matching", "Suitable Options"].map((step, i, arr) => (
                <span key={step} className="flex items-center gap-2">
                  <span className="bg-white/10 px-3 py-1.5 rounded-full whitespace-nowrap">{step}</span>
                  {i < arr.length - 1 && <ArrowRight className="w-3 h-3 flex-shrink-0 opacity-50" />}
                </span>
              ))}
            </div>

            <div className="hero-text flex flex-col sm:flex-row gap-4">
              <Link
                to="/listings"
                className="bg-white text-black px-8 py-4 rounded text-sm font-semibold hover:bg-slate-100 transition-colors text-center"
              >
                Submit Requirement
              </Link>
              <Link
                to="/vendor/login"
                className="border border-white/30 text-white px-8 py-4 rounded text-sm font-semibold hover:bg-white/10 transition-colors text-center"
              >
                List Your Property
              </Link>
            </div>
          </div>

          {/* Image side — flex child so it stays in flow, min-h for mobile */}
          <div className="hero-img w-full md:w-[45%] min-h-[280px] md:min-h-[580px] relative">
            <img
              src="/images/dubai_commercial_hero_1789645746196.jpg"
              alt="Dubai Commercial Real Estate"
              className="absolute inset-0 w-full h-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* Trust / Licence Banner */}
      <section className="trust-section px-4 md:px-8 max-w-[1200px] mx-auto mt-16">
        <div className="bg-slate-50 rounded-3xl p-8 md:p-10 border border-slate-100">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-8 justify-between">
            <div className="flex items-start gap-4 flex-1">
              <ShieldCheck className="w-8 h-8 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h2 className="text-lg font-semibold mb-1">Licensed Real Estate Brokerage — Dubai</h2>
                <p className="text-sm text-slate-500 mb-3">
                  Momentum Living Real Estate L.L.C is registered with the Dubai Department of Economy &amp; Tourism.
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs bg-blue-50 text-blue-700 border border-blue-100 px-3 py-1 rounded-full font-medium">
                    Leasing Property Brokerage — Active
                  </span>
                  <span className="text-xs bg-blue-50 text-blue-700 border border-blue-100 px-3 py-1 rounded-full font-medium">
                    Real Estate Buying &amp; Selling Brokerage — Active
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-row md:flex-col gap-6 md:gap-2 md:text-right border-t md:border-t-0 md:border-l border-slate-200 pt-6 md:pt-0 md:pl-10 shrink-0">
              <div>
                <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Commercial Licence</div>
                <div className="text-2xl font-semibold text-slate-800">1606417</div>
              </div>
              <div>
                <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Legal Type</div>
                <div className="text-sm font-medium text-slate-600">LLC — Single Owner</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Property Solutions */}
      <section id="solutions" className="categories-section px-4 md:px-8 max-w-[1200px] mx-auto mt-32">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-serif mb-4">Commercial Property Solutions</h2>
          <p className="text-slate-500 max-w-xl mx-auto text-sm leading-relaxed">
            Three core verticals. Tell us your requirement and we match you with suitable available properties from our database.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Labour Accommodation */}
          <div
            className="category-card group cursor-pointer rounded-2xl overflow-hidden border border-slate-100 hover:border-slate-300 transition-all shadow-sm hover:shadow-lg"
            onClick={() => navigate("/listings?type=accommodation")}
          >
            <div className="relative h-44 overflow-hidden">
              <img
                src="/images/professional_accommodation_1789645786277.jpg"
                alt="Labour Accommodation"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent" />
              <div className="absolute bottom-4 left-4">
                <div className="w-9 h-9 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>
            <div className="p-7 bg-white">
              <h3 className="text-xl font-serif mb-2">Labour Accommodation</h3>
              <p className="text-sm text-slate-500 mb-5 leading-relaxed">
                Rooms, floors, full camps, and sublease opportunities for workforce housing. Covers MOHRE and Ejari requirements.
              </p>
              <span className="text-sm font-medium border-b border-black pb-0.5 group-hover:text-blue-600 group-hover:border-blue-600 transition-colors inline-flex items-center gap-1.5">
                Browse Accommodation <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>

          {/* Warehouses */}
          <div
            className="category-card group cursor-pointer rounded-2xl overflow-hidden border border-slate-100 hover:border-slate-300 transition-all shadow-sm hover:shadow-lg"
            onClick={() => navigate("/listings?type=warehouse")}
          >
            <div className="relative h-44 overflow-hidden">
              <img
                src="/images/modern_warehouse_1789645765775.jpg"
                alt="Warehouse"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent" />
              <div className="absolute bottom-4 left-4">
                <div className="w-9 h-9 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>
            <div className="p-7 bg-white">
              <h3 className="text-xl font-serif mb-2">Warehouses</h3>
              <p className="text-sm text-slate-500 mb-5 leading-relaxed">
                Commercial, industrial, and logistics spaces for lease. Matched by area, location, type, and Ejari availability.
              </p>
              <span className="text-sm font-medium border-b border-black pb-0.5 group-hover:text-blue-600 group-hover:border-blue-600 transition-colors inline-flex items-center gap-1.5">
                Browse Warehouses <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>

          {/* Land */}
          <div
            className="category-card group cursor-pointer rounded-2xl overflow-hidden border border-slate-100 hover:border-slate-300 transition-all shadow-sm hover:shadow-lg"
            onClick={() => navigate("/listings?type=land")}
          >
            <div className="relative h-44 overflow-hidden">
              <img
                src="/images/dubai_commercial_land_1789645806536.jpg"
                alt="Commercial Land"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent" />
              <div className="absolute bottom-4 left-4">
                <div className="w-9 h-9 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                  <Map className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>
            <div className="p-7 bg-white">
              <h3 className="text-xl font-serif mb-2">Commercial Land</h3>
              <p className="text-sm text-slate-500 mb-5 leading-relaxed">
                Freehold and leasehold land for development and investment. Supports buying and selling brokerage transactions.
              </p>
              <span className="text-sm font-medium border-b border-black pb-0.5 group-hover:text-blue-600 group-hover:border-blue-600 transition-colors inline-flex items-center gap-1.5">
                Browse Land <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="steps-section px-4 md:px-8 max-w-[1200px] mx-auto mt-32 mb-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-serif mb-4">How the Matching Works</h2>
          <p className="text-slate-500 max-w-xl mx-auto text-sm leading-relaxed">
            A structured qualification process that ensures every party is verified and every match is relevant.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
          {/* Connector line (desktop only) */}
          <div className="hidden md:block absolute top-10 left-[12.5%] right-[12.5%] h-px bg-slate-200 z-0" />

          {[
            {
              icon: FileText,
              step: "01",
              title: "Tell Us What You Need",
              body: "Share your property type, preferred location, size, and budget. Takes less than 2 minutes.",
            },
            {
              icon: Smartphone,
              step: "02",
              title: "Quick OTP Verification",
              body: "Confirm your mobile number so we can reach you with the right options.",
            },
            {
              icon: Search,
              step: "03",
              title: "We Find the Right Fit",
              body: "Our team reviews your requirement and shortlists the most suitable available properties.",
            },
            {
              icon: CheckCircle2,
              step: "04",
              title: "Get Your Top 3 Options",
              body: "We share the best matches and connect you directly with the property owner.",
            },
          ].map(({ icon: Icon, step, title, body }) => (
            <div key={step} className="step-item relative z-10 flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center mb-5">
                <Icon className="w-8 h-8 text-slate-700" />
              </div>
              <div className="text-xs font-semibold text-slate-400 tracking-widest mb-2 uppercase">{step}</div>
              <h3 className="text-base font-semibold mb-2">{title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Two-Sided Marketplace */}
      <section className="mid-section bg-slate-50 py-24 px-4 md:px-8 mt-20 mb-20 overflow-hidden">
        <div className="max-w-[1400px] mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12 items-center">
          <div className="mid-img-left md:col-span-4 h-[460px] rounded-[2rem] overflow-hidden shadow-xl shadow-slate-200">
            <img
              src="/images/modern_warehouse_1789645765775.jpg"
              alt="Warehouse Facility"
              className="w-full h-full object-cover"
            />
          </div>

          <div className="mid-text md:col-span-4 flex flex-col items-center text-center px-4">
            <h2 className="text-3xl md:text-4xl font-serif mb-3 leading-tight">
              Built for Both Sides of the Market
            </h2>
            <p className="text-sm text-slate-500 mb-8 leading-relaxed">
              Whether you have a commercial requirement or an available property, we handle the matching.
            </p>

            <div className="w-full space-y-4">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 text-left">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">Demand Side</span>
                </div>
                <h4 className="font-semibold text-base mb-1">Looking for Property?</h4>
                <p className="text-xs text-slate-500 mb-4 leading-relaxed">Tenant, buyer, or sub-lessor. Submit your requirement and get matched options.</p>
                <Link
                  to="/listings"
                  className="flex items-center justify-center gap-2 bg-black text-white px-6 py-2.5 rounded text-sm font-medium hover:bg-slate-800 transition-colors w-full"
                >
                  Submit Requirement <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 text-left">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-green-600">Supply Side</span>
                </div>
                <h4 className="font-semibold text-base mb-1">Have Property Available?</h4>
                <p className="text-xs text-slate-500 mb-4 leading-relaxed">Landlord, management company, or seller. List your availability for matching.</p>
                <Link
                  to="/vendor/login"
                  className="flex items-center justify-center gap-2 border border-slate-300 text-black px-6 py-2.5 rounded text-sm font-medium hover:bg-slate-50 transition-colors w-full"
                >
                  List Your Property <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>

          <div className="mid-img-right md:col-span-4 h-[460px] rounded-[2rem] overflow-hidden shadow-xl shadow-slate-200 mt-8 md:mt-0">
            <img
              src="/images/professional_accommodation_1789645786277.jpg"
              alt="Worker Accommodation"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* Bottom Banner */}
      <section className="bottom-banner px-4 md:px-8 max-w-[1400px] mx-auto mb-24">
        <div className="relative rounded-[2.5rem] overflow-hidden min-h-[520px] flex items-end p-12 md:p-20 shadow-2xl shadow-slate-900/20">
          <img
            src="/images/dubai_commercial_hero_1789645746196.jpg"
            alt="Dubai Commercial Real Estate"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/50 to-transparent" />

          <div className="relative z-10 max-w-xl text-white">
            <span className="text-xs tracking-[0.2em] text-white/60 uppercase mb-4 block">Dubai DET Licensed</span>
            <h2 className="text-4xl md:text-5xl font-serif mb-6 leading-tight">
              Your commercial <br />
              <span className="italic">matching engine</span>
            </h2>
            <p className="text-white/70 mb-10 leading-relaxed text-sm md:text-base max-w-sm">
              We collect qualified business requirements, verify contacts via OTP, and use our database to match you with the most suitable commercial options in Dubai.
            </p>
            <Link
              to="/listings"
              className="bg-white text-black px-10 py-3.5 rounded text-sm font-semibold hover:bg-slate-100 transition-colors inline-flex items-center gap-2"
            >
              Start Your Journey <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Contact Strip */}
      <section id="contact" className="contact-section px-4 md:px-8 max-w-[1200px] mx-auto mb-32">
        <div className="bg-[#1D3B53] rounded-3xl p-10 md:p-14 flex flex-col md:flex-row items-center justify-between gap-10">
          <div className="text-white text-center md:text-left">
            <h3 className="text-2xl font-serif mb-2">Get in Touch</h3>
            <p className="text-[#A6C0D2] text-sm max-w-sm leading-relaxed">
              Speak directly with our commercial real estate team about your requirement or available property.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <a
              href="mailto:hello@momentumliving.ae"
              className="flex items-center gap-3 bg-white/10 hover:bg-white/20 text-white border border-white/20 px-6 py-3.5 rounded text-sm font-medium transition-colors"
            >
              <Mail className="w-4 h-4" />
              hello@momentumliving.ae
            </a>
            <a
              href="tel:+971"
              className="flex items-center gap-3 bg-white text-black px-6 py-3.5 rounded text-sm font-semibold hover:bg-slate-100 transition-colors"
            >
              <Phone className="w-4 h-4" />
              Call Us
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#1D3B53] text-white">
        <div className="max-w-[1400px] mx-auto px-8 pt-20 pb-10">

          <div className="grid grid-cols-1 md:grid-cols-12 gap-12 pb-16 border-b border-white/10">

            {/* Brand */}
            <div className="md:col-span-4">
              <div className="text-2xl font-bold italic font-serif mb-1">
                Momentum<span className="font-sans font-semibold not-italic">Living</span>
              </div>
              <div className="text-xs text-white/60 mb-4 tracking-wide">Momentum Living Real Estate L.L.C</div>
              <p className="text-[#A6C0D2] text-sm leading-relaxed max-w-xs mb-4">
                Dubai&apos;s commercial real estate brokerage. Connecting business requirements with suitable available properties through a structured matching process.
              </p>
              <div className="flex flex-col gap-2 text-sm text-[#A6C0D2]">
                <a href="mailto:hello@momentumliving.ae" className="hover:text-white transition-colors flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5" /> hello@momentumliving.ae
                </a>
                <div className="text-xs mt-2 text-white/40">
                  Licence No. 1606417 · LLC-SO · Dubai, UAE
                </div>
              </div>
            </div>

            {/* Solutions */}
            <div className="md:col-span-2 md:col-start-6">
              <h4 className="text-xs tracking-[0.2em] uppercase text-[#A6C0D2] mb-6">Solutions</h4>
              <ul className="space-y-4 text-sm">
                <li><Link to="/listings" className="hover:text-[#A6C0D2] transition-colors">Submit Requirement</Link></li>
                <li><Link to="/listings?type=accommodation" className="hover:text-[#A6C0D2] transition-colors">Labour Accommodation</Link></li>
                <li><Link to="/listings?type=warehouse" className="hover:text-[#A6C0D2] transition-colors">Warehouses</Link></li>
                <li><Link to="/listings?type=land" className="hover:text-[#A6C0D2] transition-colors">Commercial Land</Link></li>
              </ul>
            </div>

            {/* Supply Side */}
            <div className="md:col-span-2">
              <h4 className="text-xs tracking-[0.2em] uppercase text-[#A6C0D2] mb-6">Supply Side</h4>
              <ul className="space-y-4 text-sm">
                <li><Link to="/vendor/login" className="hover:text-[#A6C0D2] transition-colors">List Your Property</Link></li>
                <li><Link to="/vendor/register" className="hover:text-[#A6C0D2] transition-colors">Register as Landlord</Link></li>
                <li><Link to="/vendor/dashboard" className="hover:text-[#A6C0D2] transition-colors">Landlord Dashboard</Link></li>
              </ul>
            </div>

            {/* Company */}
            <div className="md:col-span-2">
              <h4 className="text-xs tracking-[0.2em] uppercase text-[#A6C0D2] mb-6">Company</h4>
              <ul className="space-y-4 text-sm">
                <li><a href="#how-it-works" className="hover:text-[#A6C0D2] transition-colors">How It Works</a></li>
                <li><a href="#features" className="hover:text-[#A6C0D2] transition-colors">Licence Details</a></li>
                <li><a href="mailto:hello@momentumliving.ae" className="hover:text-[#A6C0D2] transition-colors">Get in Touch</a></li>
                <li><Link to="/login" className="hover:text-[#A6C0D2] transition-colors">Sign In</Link></li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8 text-[#A6C0D2] text-xs">
            <span>&copy; {new Date().getFullYear()} Momentum Living Real Estate L.L.C. All rights reserved.</span>
            <div className="flex items-center gap-6">
              <span className="hover:text-white cursor-pointer transition-colors">Privacy Policy</span>
              <span className="hover:text-white cursor-pointer transition-colors">Terms of Service</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
