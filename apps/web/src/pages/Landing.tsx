import { Link } from "react-router-dom";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CheckCircle2, ShieldCheck, Map } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

export default function Landing() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Hero animations
      gsap.from(".hero-text", {
        y: 50,
        opacity: 0,
        duration: 1,
        stagger: 0.2,
        ease: "power3.out"
      });
      
      gsap.from(".hero-img", {
        scale: 1.05,
        opacity: 0,
        duration: 1.2,
        delay: 0.3,
        ease: "power3.out"
      });

      // Features section
      gsap.from(".feature-item", {
        scrollTrigger: { trigger: ".features-section", start: "top 80%" },
        y: 40,
        opacity: 0,
        duration: 0.8,
        stagger: 0.2,
        ease: "power3.out"
      });

      // Middle section animations
      gsap.from(".mid-img-left", {
        scrollTrigger: { trigger: ".mid-section", start: "top 75%" },
        x: -50,
        opacity: 0,
        duration: 1,
        ease: "power3.out"
      });

      gsap.from(".mid-img-right", {
        scrollTrigger: { trigger: ".mid-section", start: "top 75%" },
        x: 50,
        opacity: 0,
        duration: 1,
        ease: "power3.out"
      });

      gsap.from(".mid-text", {
        scrollTrigger: { trigger: ".mid-section", start: "top 75%" },
        y: 30,
        opacity: 0,
        duration: 1,
        delay: 0.2,
        ease: "power3.out"
      });

      // Categories section
      gsap.from(".category-card", {
        scrollTrigger: { trigger: ".categories-section", start: "top 80%" },
        y: 30,
        opacity: 0,
        duration: 0.8,
        stagger: 0.15,
        ease: "power3.out"
      });

      // Bottom banner animations
      gsap.from(".bottom-banner", {
        scrollTrigger: { trigger: ".bottom-banner", start: "top 85%" },
        y: 40,
        opacity: 0,
        duration: 1,
        ease: "power3.out"
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className="min-h-screen bg-white font-sans overflow-hidden text-slate-900">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-6 max-w-[1400px] mx-auto">
        <div className="text-xl font-bold italic font-serif">
          Momentum<span className="font-sans font-semibold">Living</span>
        </div>
        
        <div className="hidden md:flex items-center gap-12 text-sm text-slate-500 font-medium">
          <Link to="/listings" className="hover:text-black transition-colors">Verified Properties</Link>
          <Link to="/vendor/login" className="hover:text-black transition-colors">List Property</Link>
          <a href="#features" className="hover:text-black transition-colors">Why Us</a>
          <a href="#contact" className="hover:text-black transition-colors">Get in touch</a>
        </div>

        <Link
          to="/login"
          className="bg-black text-white px-8 py-3 rounded text-sm font-medium hover:bg-slate-800 transition-colors"
        >
          Sign In
        </Link>
      </nav>

      {/* Hero */}
      <section className="px-4 md:px-8 max-w-[1400px] mx-auto mt-4">
        <div className="bg-[#1D3B53] rounded-[2.5rem] flex flex-col md:flex-row overflow-hidden min-h-[600px] relative shadow-2xl shadow-blue-900/10">
          <div className="flex-1 p-12 md:p-20 flex flex-col justify-center z-10 text-white w-full md:w-[55%]">
            <span className="hero-text text-xs tracking-[0.2em] text-[#A6C0D2] mb-6 uppercase">
              Your Premier Property Marketplace
            </span>
            <h1 className="hero-text text-5xl md:text-6xl lg:text-7xl font-serif leading-[1.1] mb-8">
              Discover Verified <br />
              <span className="italic font-light">Properties &</span> <br />
              Modern Spaces
            </h1>
            <div className="hero-text flex gap-4 mt-4">
               <Link
                to="/listings"
                className="bg-white text-black px-8 py-3.5 rounded text-sm font-semibold hover:bg-slate-100 transition-colors"
              >
                Browse Listings
              </Link>
               <Link
                to="/vendor/login"
                className="border border-white/30 text-white px-8 py-3.5 rounded text-sm font-semibold hover:bg-white/10 transition-colors"
              >
                List Your Property
              </Link>
            </div>
          </div>
          
          <div className="hero-img absolute right-0 top-0 bottom-0 w-full md:w-[45%] h-full">
            <img 
              src="/images/hero_modern_home_1789544153245.jpg" 
              alt="Modern Home"
              className="w-full h-full object-cover rounded-l-none md:rounded-l-[4rem] rounded-r-[2.5rem]"
            />
          </div>
        </div>
      </section>

      {/* Features Section (New) */}
      <section id="features" className="features-section px-4 md:px-8 max-w-[1200px] mx-auto mt-32">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-serif mb-4">A Marketplace Built on Trust</h2>
          <p className="text-slate-500 max-w-2xl mx-auto">We streamline the real estate journey by ensuring quality, transparency, and security for every transaction on our platform.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="feature-item flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-full bg-slate-50 flex items-center justify-center mb-6">
              <ShieldCheck className="w-6 h-6 text-slate-800" />
            </div>
            <h3 className="text-xl font-medium mb-3">100% Verified</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              Every property and landlord is strictly vetted by our admin team before going live. Say goodbye to fake listings.
            </p>
          </div>
          <div className="feature-item flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-full bg-slate-50 flex items-center justify-center mb-6">
              <Map className="w-6 h-6 text-slate-800" />
            </div>
            <h3 className="text-xl font-medium mb-3">Diverse Portfolio</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              From luxury residential villas to commercial plots, find the exact spaces that match your lifestyle and investment goals.
            </p>
          </div>
          <div className="feature-item flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-full bg-slate-50 flex items-center justify-center mb-6">
              <CheckCircle2 className="w-6 h-6 text-slate-800" />
            </div>
            <h3 className="text-xl font-medium mb-3">Seamless Connection</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              Directly connect with sellers and buyers through our secure platform. We facilitate the deal from discovery to handover.
            </p>
          </div>
        </div>
      </section>

      {/* Middle Section (Asymmetrical layout) */}
      <section className="mid-section px-4 md:px-8 max-w-[1400px] mx-auto mt-32 mb-32 grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* Left Image */}
        <div className="mid-img-left md:col-span-3 h-[400px] rounded-[2rem] overflow-hidden shadow-xl shadow-slate-200">
          <img 
            src="/images/interior_living_1789544175691.jpg" 
            alt="Interior Living" 
            className="w-full h-full object-cover"
          />
        </div>

        {/* Center Text */}
        <div className="mid-text md:col-span-6 flex flex-col items-center text-center px-4 md:px-8">
          <div className="w-3 h-3 bg-black rotate-45 mb-10"></div>
          <h2 className="text-4xl md:text-5xl font-serif mb-6 leading-tight">
            If you can <span className="italic text-slate-600">seek it</span>, we <br/> can match it.
          </h2>
          <p className="text-sm text-slate-500 leading-relaxed mb-10 max-w-md">
            We adapt a uniquely personalised approach to help you find stunning spaces. Renowned for our meticulous verification and masterful service, our real estate marketplace stands apart in delivering quality and peace of mind.
          </p>
          <Link
            to="/listings"
            className="bg-black text-white px-8 py-3.5 rounded text-sm font-medium hover:bg-slate-800 transition-colors"
          >
            Explore Properties
          </Link>
        </div>

        {/* Right Image */}
        <div className="mid-img-right md:col-span-3 h-[500px] rounded-[2rem] overflow-hidden shadow-xl shadow-slate-200 mt-12 md:mt-0">
          <img 
            src="/images/exterior_patio_1789544274451.jpg" 
            alt="Exterior Patio" 
            className="w-full h-full object-cover"
          />
        </div>
      </section>

      {/* Categories Section (New) */}
      <section className="categories-section px-4 md:px-8 max-w-[1200px] mx-auto mb-32">
        <div className="flex justify-between items-end mb-12">
          <div>
            <h2 className="text-3xl md:text-4xl font-serif mb-3">Explore by Category</h2>
            <p className="text-slate-500">Curated collections for every requirement.</p>
          </div>
          <Link to="/listings" className="hidden md:block text-sm font-semibold hover:underline">View All &rarr;</Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="category-card group cursor-pointer rounded-2xl bg-slate-50 p-8 transition-colors hover:bg-slate-100">
             <h3 className="text-2xl font-serif mb-2 group-hover:text-slate-700 transition-colors">Residential</h3>
             <p className="text-sm text-slate-500 mb-6">Full homes, villas, and modern apartments ready to move in.</p>
             <span className="text-sm font-medium border-b border-black pb-0.5">Browse Homes</span>
          </div>
          <div className="category-card group cursor-pointer rounded-2xl bg-slate-50 p-8 transition-colors hover:bg-slate-100">
             <h3 className="text-2xl font-serif mb-2 group-hover:text-slate-700 transition-colors">Prime Plots</h3>
             <p className="text-sm text-slate-500 mb-6">Land plots verified and ready for your custom development.</p>
             <span className="text-sm font-medium border-b border-black pb-0.5">Browse Plots</span>
          </div>
          <div className="category-card group cursor-pointer rounded-2xl bg-slate-50 p-8 transition-colors hover:bg-slate-100">
             <h3 className="text-2xl font-serif mb-2 group-hover:text-slate-700 transition-colors">Rooms</h3>
             <p className="text-sm text-slate-500 mb-6">Individual rooms and premium shared accommodation options.</p>
             <span className="text-sm font-medium border-b border-black pb-0.5">Browse Rooms</span>
          </div>
        </div>
      </section>

      {/* Bottom Banner */}
      <section className="bottom-banner px-4 md:px-8 max-w-[1400px] mx-auto">
        <div className="relative rounded-[2.5rem] overflow-hidden min-h-[500px] flex items-end p-12 md:p-20 shadow-2xl shadow-slate-900/20">
          <img
            src="/images/kitchen_interior_1789544288691.jpg"
            alt="Kitchen Interior"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/60"></div>

          <div className="relative z-10 max-w-xl text-white">
            <h2 className="text-4xl md:text-5xl font-serif mb-6">
              Curated premium <span className="italic">properties</span>
            </h2>
            <p className="text-slate-300 mb-10 leading-relaxed text-sm md:text-base max-w-md">
              We&apos;ve been connecting clients with dream homes they are thrilled to call their own. Discover hand-picked listings and seamless real estate transactions that elevate your standard of living.
            </p>
            <Link
              to="/listings"
              className="bg-white text-black px-10 py-3.5 rounded text-sm font-medium hover:bg-slate-100 transition-colors inline-block"
            >
              Start Exploring
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#1D3B53] text-white mt-24">
        <div className="max-w-[1400px] mx-auto px-8 pt-20 pb-10">

          {/* Top grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12 pb-16 border-b border-white/10">

            {/* Brand column */}
            <div className="md:col-span-4">
              <div className="text-2xl font-bold italic font-serif mb-4">
                Momentum<span className="font-sans font-semibold not-italic">Living</span>
              </div>
              <p className="text-[#A6C0D2] text-sm leading-relaxed max-w-xs">
                UAE&apos;s premier verified property marketplace. Connecting buyers, renters, and owners through a trusted, transparent platform.
              </p>
              <div className="flex items-center gap-4 mt-8">
                <a
                  href="mailto:hello@momentumliving.ae"
                  className="text-[#A6C0D2] hover:text-white text-sm transition-colors"
                >
                  hello@momentumliving.ae
                </a>
              </div>
            </div>

            {/* Explore */}
            <div className="md:col-span-2 md:col-start-6">
              <h4 className="text-xs tracking-[0.2em] uppercase text-[#A6C0D2] mb-6">Explore</h4>
              <ul className="space-y-4 text-sm">
                <li><Link to="/listings" className="hover:text-[#A6C0D2] transition-colors">All Properties</Link></li>
                <li><Link to="/listings?type=residential" className="hover:text-[#A6C0D2] transition-colors">Residential</Link></li>
                <li><Link to="/listings?type=plot" className="hover:text-[#A6C0D2] transition-colors">Prime Plots</Link></li>
                <li><Link to="/listings?type=room" className="hover:text-[#A6C0D2] transition-colors">Rooms</Link></li>
              </ul>
            </div>

            {/* Owners */}
            <div className="md:col-span-2">
              <h4 className="text-xs tracking-[0.2em] uppercase text-[#A6C0D2] mb-6">For Owners</h4>
              <ul className="space-y-4 text-sm">
                <li><Link to="/vendor/login" className="hover:text-[#A6C0D2] transition-colors">List Your Property</Link></li>
                <li><Link to="/vendor/register" className="hover:text-[#A6C0D2] transition-colors">Register as Owner</Link></li>
                <li><Link to="/vendor/dashboard" className="hover:text-[#A6C0D2] transition-colors">Owner Dashboard</Link></li>
              </ul>
            </div>

            {/* Company */}
            <div className="md:col-span-2">
              <h4 className="text-xs tracking-[0.2em] uppercase text-[#A6C0D2] mb-6">Company</h4>
              <ul className="space-y-4 text-sm">
                <li><a href="#features" className="hover:text-[#A6C0D2] transition-colors">Why Us</a></li>
                <li><a href="mailto:hello@momentumliving.ae" className="hover:text-[#A6C0D2] transition-colors">Get in Touch</a></li>
                <li><Link to="/login" className="hover:text-[#A6C0D2] transition-colors">Sign In</Link></li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8 text-[#A6C0D2] text-xs">
            <span>&copy; {new Date().getFullYear()} MomentumLiving. All rights reserved.</span>
            <div className="flex items-center gap-6">
              <span className="hover:text-white cursor-pointer transition-colors">Privacy Policy</span>
              <span className="hover:text-white cursor-pointer transition-colors">Terms of Service</span>
              <span className="hover:text-white cursor-pointer transition-colors">Cookie Policy</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
