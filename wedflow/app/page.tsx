"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

// ─── Brand constants ──────────────────────────────────────────────────────────

const C = {
  forest: "#1C3B2B",
  cream: "#FDFBF7",
  terracotta: "#C4714A",
  text: "#1A1A1A",
} as const;

// ─── Email Capture ────────────────────────────────────────────────────────────

function EmailCapture({
  buttonText = "Request Early Access",
  variant = "light",
}: {
  buttonText?: string;
  variant?: "light" | "dark";
}) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || isSubmitting) return;
    setIsSubmitting(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error("Failed");
      setSubmitted(true);
    } catch {
      setErrorMsg("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex items-center gap-3 py-4">
        <div
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: C.terracotta }}
        />
        <p
          className="wf-sans text-sm font-medium"
          style={{ color: variant === "dark" ? C.cream : C.forest }}
        >
          You&apos;re on the list. We&apos;ll reach out with next steps.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col sm:flex-row gap-3"
      >
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
          disabled={isSubmitting}
          className="flex-1 px-5 py-3.5 rounded-full border text-sm focus:outline-none focus:ring-2 transition-colors wf-sans disabled:opacity-60"
          style={{
            backgroundColor: "#ffffff",
            borderColor: "rgba(28,59,43,0.2)",
            color: C.text,
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "rgba(28,59,43,0.5)";
            e.currentTarget.style.boxShadow = "0 0 0 3px rgba(28,59,43,0.08)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "rgba(28,59,43,0.2)";
            e.currentTarget.style.boxShadow = "none";
          }}
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-7 py-3.5 rounded-full text-sm font-medium whitespace-nowrap transition-opacity hover:opacity-90 disabled:opacity-60 wf-sans"
          style={{ backgroundColor: C.terracotta, color: C.cream }}
        >
          {isSubmitting ? "Submitting…" : buttonText}
        </button>
      </form>
      {errorMsg && (
        <p className="mt-2 text-xs ml-1 wf-sans" style={{ color: C.terracotta }}>
          {errorMsg}
        </p>
      )}
    </div>
  );
}

// ─── Nav ──────────────────────────────────────────────────────────────────────

function Nav() {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsSignedIn(!!user);
      setIsLoading(false);
    });
  }, []);

  return (
    <nav
      className="sticky top-0 z-50 backdrop-blur-sm"
      style={{
        backgroundColor: "rgba(253,251,247,0.96)",
        borderBottom: "1px solid rgba(28,59,43,0.1)",
      }}
    >
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/WedFlowlogo.png"
            alt="Wedflow"
            width={40}
            height={40}
            className="w-auto"
            style={{ height: "40px" }}
            priority
          />
          <span
            className="wf-serif font-semibold text-xl"
            style={{ color: C.forest, fontFamily: "var(--newsreader), Georgia, serif" }}
          >
            Wedflow
          </span>
        </Link>
        <div className="flex items-center gap-6">
          {isSignedIn ? (
            <Link
              href="/dashboard"
              className="px-6 py-2.5 rounded-full text-sm font-medium transition-opacity hover:opacity-90 wf-sans"
              style={{ backgroundColor: C.forest, color: C.cream }}
            >
              Go to Dashboard →
            </Link>
          ) : (
            <Link
              href="/sign-up"
              className="px-6 py-2.5 rounded-full text-sm font-medium transition-opacity hover:opacity-90 wf-sans"
              style={{ backgroundColor: C.terracotta, color: C.cream }}
            >
              Begin Your Journey →
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function HeroIllustration() {
  return (
    <div className="hidden lg:block lg:col-span-5">
      <div className="relative h-[380px] w-full">
        {/* Guest bubble 1 — top left */}
        <div
          className="absolute top-0 left-0 rounded-2xl rounded-tl-sm px-5 py-3.5 shadow-md max-w-[220px]"
          style={{
            backgroundColor: "#ffffff",
            border: "1px solid rgba(28,59,43,0.09)",
          }}
        >
          <p className="wf-sans text-xs mb-1" style={{ color: "rgba(28,59,43,0.45)", fontSize: "10px", letterSpacing: "0.05em" }}>
            Sarah M. · 9:14 AM
          </p>
          <p className="wf-sans text-sm" style={{ color: C.text }}>
            What&apos;s the dress code? 👗
          </p>
        </div>

        {/* Wedflow reply — middle right */}
        <div
          className="absolute top-16 right-0 rounded-2xl rounded-tr-sm px-5 py-3.5 shadow-md max-w-[230px]"
          style={{ backgroundColor: C.forest }}
        >
          <p
            className="wf-sans text-xs mb-1"
            style={{ color: "rgba(253,251,247,0.5)", fontSize: "10px", letterSpacing: "0.05em" }}
          >
            Wedflow · just now
          </p>
          <p className="wf-sans text-sm leading-relaxed" style={{ color: C.cream }}>
            Garden formal — florals and linens are very welcome! 🌸
          </p>
        </div>

        {/* Guest bubble 2 — bottom left */}
        <div
          className="absolute bottom-12 left-6 rounded-2xl rounded-bl-sm px-5 py-3.5 shadow-md max-w-[210px]"
          style={{
            backgroundColor: "#ffffff",
            border: "1px solid rgba(28,59,43,0.09)",
          }}
        >
          <p className="wf-sans text-xs mb-1" style={{ color: "rgba(28,59,43,0.45)", fontSize: "10px", letterSpacing: "0.05em" }}>
            James K. · 9:31 AM
          </p>
          <p className="wf-sans text-sm" style={{ color: C.text }}>
            Is there parking nearby? 🚗
          </p>
        </div>

        {/* Wedflow reply 2 — bottom right */}
        <div
          className="absolute bottom-0 right-4 rounded-2xl rounded-br-sm px-5 py-3.5 shadow-md max-w-[220px]"
          style={{ backgroundColor: C.forest }}
        >
          <p
            className="wf-sans text-xs mb-1"
            style={{ color: "rgba(253,251,247,0.5)", fontSize: "10px", letterSpacing: "0.05em" }}
          >
            Wedflow · just now
          </p>
          <p className="wf-sans text-sm leading-relaxed" style={{ color: C.cream }}>
            Free parking in Lot C — just east of the main entrance. ✓
          </p>
        </div>
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section
      className="min-h-[88vh] flex items-center overflow-hidden"
      style={{ backgroundColor: C.cream }}
    >
      <div className="max-w-7xl mx-auto px-6 py-24 w-full">
        <div className="grid lg:grid-cols-12 gap-16 items-center">
          {/* Left column */}
          <div className="lg:col-span-7 animate-fade-in-up">
            {/* Eyebrow rule */}
            <div className="flex items-center gap-4 mb-10">
              <div
                className="h-px w-12"
                style={{ backgroundColor: C.terracotta }}
              />
              <span
                className="wf-sans text-xs tracking-[0.2em] uppercase"
                style={{ color: "rgba(26,26,26,0.5)" }}
              >
                Wedding Concierge
              </span>
            </div>

            <h1
              className="wf-serif font-bold leading-[1.05] text-5xl sm:text-6xl md:text-7xl xl:text-8xl mb-6"
              style={{ color: C.forest, fontFamily: "var(--newsreader), Georgia, serif" }}
            >
              Your guests have
              <br />
              <em className="italic">something to say.</em>
            </h1>

            <p
              className="wf-sans text-lg mb-10 max-w-lg leading-relaxed animate-fade-in-up-delay"
              style={{ color: "rgba(26,26,26,0.65)" }}
            >
              WedFlow is the first inbound AI SMS service for weddings. Guests
              text a dedicated number with questions — and things they can't
              say to your face. The AI replies in your voice for logistics, and
              escalates sensitive messages for your eyes only.
            </p>

            <div className="animate-fade-in-up-delay-2">
              <EmailCapture />
              <p
                className="mt-4 wf-sans text-xs ml-1"
                style={{ color: "rgba(26,26,26,0.4)" }}
              >
                Paid beta — limited spots. We&apos;ll reach out with pricing.
              </p>
            </div>
          </div>

          {/* Right column — refined SMS illustration */}
          <HeroIllustration />
        </div>
      </div>
    </section>
  );
}

// ─── Social Proof Bar ─────────────────────────────────────────────────────────

function SocialProofBar() {
  return (
    <div
      style={{
        backgroundColor: C.cream,
        borderTop: "1px solid rgba(28,59,43,0.1)",
        borderBottom: "1px solid rgba(28,59,43,0.1)",
      }}
    >
      <div className="max-w-7xl mx-auto px-6 py-5">
        <p
          className="wf-sans text-sm text-center tracking-wide"
          style={{ color: "rgba(26,26,26,0.55)" }}
        >
          The emotional buffer for what guests can't say directly —
          used by couples across Canada
        </p>
      </div>
    </div>
  );
}

// ─── How It Works ─────────────────────────────────────────────────────────────

function HowItWorks() {
  const steps = [
    {
      number: "01",
      heading: "Guests text your WedFlow number",
      body: "Questions, RSVPs, dietary restrictions — and the things they can't say to your face. Everything comes to one place.",
    },
    {
      number: "02",
      heading: "AI replies in your voice, instantly",
      body: "Logistics and FAQs get warm, accurate responses that sound like you. No more 2am text interruptions.",
    },
    {
      number: "03",
      heading: "Sensitive messages? Escalated to you",
      body: "When guests share something emotional, the AI classifies it and holds it for your review with a draft reply ready.",
    },
  ];

  return (
    <section className="py-24 px-6" style={{ backgroundColor: C.forest }}>
      <div className="max-w-7xl mx-auto">
        {/* Section header */}
        <div className="mb-16">
          <div className="flex items-center gap-4 mb-5">
            <div
              className="h-px w-8"
              style={{ backgroundColor: C.terracotta }}
            />
            <span
              className="wf-sans text-xs tracking-[0.2em] uppercase"
              style={{ color: "rgba(253,251,247,0.5)" }}
            >
              How it works
            </span>
          </div>
          <h2
            className="wf-serif font-bold text-4xl sm:text-5xl leading-tight max-w-xl"
            style={{ color: C.cream, fontFamily: "var(--newsreader), Georgia, serif" }}
          >
            Effortless, from the first message.
          </h2>
        </div>

        {/* Steps grid */}
        <div
          className="grid md:grid-cols-3"
          style={{ gap: "1px", backgroundColor: "rgba(253,251,247,0.1)" }}
        >
          {steps.map((step, i) => (
            <div
              key={i}
              className="p-10 md:p-12 flex flex-col gap-6"
              style={{ backgroundColor: C.forest }}
            >
              <span
                className="wf-serif font-bold text-6xl leading-none"
                style={{ color: C.terracotta }}
              >
                {step.number}
              </span>
              <div>
                <h3
                  className="wf-serif font-semibold text-xl mb-3 leading-snug"
                  style={{ color: C.cream }}
                >
                  {step.heading}
                </h3>
                <p
                  className="wf-sans text-sm leading-relaxed"
                  style={{ color: "rgba(253,251,247,0.6)" }}
                >
                  {step.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Features ─────────────────────────────────────────────────────────────────

function Features() {
  const features = [
    {
      heading: "A calm centre for guest inquiries",
      body: "Dress code, venue directions, parking, registry — your concierge handles the questions guests ask dozens of times, so you never have to.",
    },
    {
      heading: "Drafted replies, in your voice",
      body: "When a message calls for your personal touch, Wedflow prepares a thoughtful reply for your review. You approve, edit, or send as-is.",
    },
    {
      heading: "Set up in ten minutes",
      body: "Share your wedding details once during a guided onboarding. From that moment, your concierge is ready — no maintenance required.",
    },
  ];

  return (
    <section className="py-24 px-6" style={{ backgroundColor: C.cream }}>
      <div className="max-w-7xl mx-auto">
        {/* Section header */}
        <div className="mb-16">
          <div className="flex items-center gap-4 mb-5">
            <div
              className="h-px w-8"
              style={{ backgroundColor: C.terracotta }}
            />
            <span
              className="wf-sans text-xs tracking-[0.2em] uppercase"
              style={{ color: "rgba(26,26,26,0.4)" }}
            >
              What&apos;s included
            </span>
          </div>
          <h2
            className="wf-serif font-bold text-4xl sm:text-5xl leading-tight max-w-xl"
            style={{ color: C.forest, fontFamily: "var(--newsreader), Georgia, serif" }}
          >
            Everything your day deserves.
          </h2>
        </div>

        {/* Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <div
              key={i}
              className="rounded-2xl p-8 flex flex-col gap-4 hover:shadow-md transition-shadow"
              style={{
                backgroundColor: "#ffffff",
                boxShadow: "0 1px 6px rgba(28,59,43,0.07)",
                borderTop: `3px solid ${C.terracotta}`,
              }}
            >
              <h3
                className="wf-serif font-semibold text-xl leading-snug"
                style={{ color: C.forest }}
              >
                {feature.heading}
              </h3>
              <p
                className="wf-sans text-sm leading-relaxed"
                style={{ color: "rgba(26,26,26,0.6)" }}
              >
                {feature.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Testimonial ──────────────────────────────────────────────────────────────

function Testimonial() {
  return (
    <section className="py-24 px-6" style={{ backgroundColor: C.forest }}>
      <div className="max-w-4xl mx-auto text-center">
        <div className="mb-6">
          <span
            className="wf-serif select-none"
            style={{ color: C.terracotta, fontSize: "5rem", lineHeight: 1 }}
          >
            &ldquo;
          </span>
        </div>
        <blockquote
          className="wf-serif italic font-medium text-2xl sm:text-3xl md:text-4xl leading-relaxed mb-10"
          style={{ color: C.cream }}
        >
          We stopped answering the same question 40 times. Wedflow handled it —
          and our guests loved how thoughtful the replies felt.
        </blockquote>
        <div className="flex items-center justify-center gap-4">
          <div
            className="h-px w-8"
            style={{ backgroundColor: C.terracotta }}
          />
          <cite
            className="wf-sans text-sm not-italic tracking-wide"
            style={{ color: "rgba(253,251,247,0.55)" }}
          >
            Alex &amp; Kirsten, getting married July 2026
          </cite>
          <div
            className="h-px w-8"
            style={{ backgroundColor: C.terracotta }}
          />
        </div>
      </div>
    </section>
  );
}

// ─── Final CTA ────────────────────────────────────────────────────────────────

function FinalCTA() {
  return (
    <section className="py-28 px-6" style={{ backgroundColor: C.cream }}>
      <div className="max-w-3xl mx-auto text-center">
        {/* Decorative divider */}
        <div className="flex items-center justify-center gap-4 mb-10">
          <div
            className="h-px w-10"
            style={{ backgroundColor: "rgba(28,59,43,0.15)" }}
          />
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: C.terracotta }}
          />
          <div
            className="h-px w-10"
            style={{ backgroundColor: "rgba(28,59,43,0.15)" }}
          />
        </div>

        <h2
          className="wf-serif font-bold text-4xl sm:text-5xl md:text-6xl leading-tight mb-5"
          style={{ color: C.forest, fontFamily: "var(--newsreader), Georgia, serif" }}
        >
          Your celebration deserves
          <br />
          <em className="italic">your full attention.</em>
        </h2>

        <p
          className="wf-sans text-lg mb-10 leading-relaxed"
          style={{ color: "rgba(26,26,26,0.6)" }}
        >
          Let Wedflow handle the questions.
        </p>

        <div className="flex flex-col items-center gap-4">
          <Link
            href="/sign-up"
            className="px-10 py-4 rounded-full text-sm font-medium transition-opacity hover:opacity-90 wf-sans"
            style={{ backgroundColor: C.terracotta, color: C.cream }}
          >
            Begin Your Journey →
          </Link>
        </div>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer
      className="py-10 px-6"
      style={{
        backgroundColor: C.forest,
        borderTop: "1px solid rgba(253,251,247,0.1)",
      }}
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <Image
            src="/WedFlowlogo.png"
            alt="Wedflow"
            width={32}
            height={32}
            className="w-auto"
            style={{ height: "32px", filter: "brightness(0) invert(1)" }}
          />
          <span
            className="wf-serif font-semibold text-lg"
            style={{ color: C.cream, fontFamily: "var(--newsreader), Georgia, serif" }}
          >
            Wedflow
          </span>
          <span
            className="wf-sans text-xs"
            style={{ color: "rgba(253,251,247,0.4)" }}
          >
            Made with love for couples everywhere
          </span>
        </div>
        <div className="flex items-center gap-6">
          <Link
            href="/sign-in"
            className="wf-sans text-xs transition-opacity hover:opacity-80"
            style={{ color: "rgba(253,251,247,0.5)" }}
          >
            Sign In
          </Link>
          <Link
            href="/sign-up"
            className="wf-sans text-xs transition-opacity hover:opacity-80"
            style={{ color: "rgba(253,251,247,0.5)" }}
          >
            Sign Up
          </Link>
        </div>
      </div>
    </footer>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: C.cream }}>
      <Nav />
      <Hero />
      <SocialProofBar />
      <HowItWorks />
      <Features />
      <Testimonial />
      <FinalCTA />
      <Footer />
    </div>
  );
}
