"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

// ─── Email Capture ─────────────────────────────────────────────────────────────

function EmailCapture({ variant = "light" }: { variant?: "light" | "dark" }) {
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
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 0" }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--wf-terracotta)", flexShrink: 0 }} />
        <p className="wf-sans" style={{ fontSize: 14, fontWeight: 500, color: variant === "dark" ? "var(--wf-cream)" : "var(--wf-forest)" }}>
          You&apos;re on the list. We&apos;ll reach out with next steps.
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 460 }}>
      <form onSubmit={handleSubmit} style={{ display: "flex", gap: 10 }}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
          disabled={isSubmitting}
          className="wf-sans"
          style={{
            flex: 1,
            padding: "14px 20px",
            borderRadius: 999,
            border: "1px solid var(--wf-line-strong)",
            background: "var(--wf-paper)",
            fontSize: 14,
            color: "var(--wf-ink)",
            outline: "none",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "var(--wf-forest)";
            e.currentTarget.style.boxShadow = "0 0 0 3px rgba(28,59,43,0.1)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "var(--wf-line-strong)";
            e.currentTarget.style.boxShadow = "none";
          }}
        />
        <button type="submit" disabled={isSubmitting} className="wf-btn wf-btn-primary wf-btn-lg">
          {isSubmitting ? "Submitting…" : "Request Early Access"}
        </button>
      </form>
      {errorMsg && (
        <p className="wf-sans" style={{ fontSize: 12, color: "var(--wf-terracotta)", marginTop: 8, marginLeft: 4 }}>
          {errorMsg}
        </p>
      )}
    </div>
  );
}

// ─── Nav ───────────────────────────────────────────────────────────────────────

function Nav() {
  const [isSignedIn, setIsSignedIn] = useState(false);

  useEffect(() => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsSignedIn(!!user);
    });
  }, []);

  return (
    <nav style={{
      position: "sticky",
      top: 0,
      zIndex: 50,
      background: "rgba(253,251,247,0.88)",
      backdropFilter: "blur(14px) saturate(1.2)",
      WebkitBackdropFilter: "blur(14px) saturate(1.2)",
      borderBottom: "1px solid var(--wf-line)",
    }}>
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "18px 40px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <div style={{ width: 112, height: 112, borderRadius: '22%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Image src="/LogoLight.png" alt="Wedflow" width={180} height={180} style={{ width: 180, height: 180, objectFit: 'contain', flexShrink: 0 }} priority />
          </div>
          <span className="wf-serif" style={{ fontSize: 20, fontWeight: 600, color: "var(--wf-forest)", letterSpacing: "-0.01em" }}>
            Wedflow
          </span>
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 28, fontSize: 13 }}>
          <a href="#how-it-works" className="wf-sans" style={{ color: "var(--wf-ink-60)", textDecoration: "none" }}>How it works</a>
          <a href="#features" className="wf-sans" style={{ color: "var(--wf-ink-60)", textDecoration: "none" }}>Features</a>
          {isSignedIn ? (
            <Link href="/dashboard" className="wf-btn wf-btn-forest">Go to Dashboard →</Link>
          ) : (
            <>
              <Link href="/sign-in" className="wf-sans" style={{ color: "var(--wf-ink-60)", textDecoration: "none" }}>Sign in</Link>
              <Link href="/sign-up" className="wf-btn wf-btn-primary">Begin Your Journey →</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

// ─── Circle Diagram ───────────────────────────────────────────────────────────

function CircleDiagram() {
  return (
    <div style={{ position: "relative", width: 380, height: 380, margin: "0 auto" }}>
      {/* Outer ring: guests */}
      <div style={{
        position: "absolute", inset: 0,
        borderRadius: "50%",
        border: "2px dashed var(--wf-line-strong)",
      }} />
      {/* Middle ring: inner circle */}
      <div style={{
        position: "absolute",
        top: 65, left: 65, width: 250, height: 250,
        borderRadius: "50%",
        border: "2px solid rgba(123,145,116,0.35)",
        background: "rgba(123,145,116,0.04)",
      }} />
      {/* Center: couple */}
      <div style={{
        position: "absolute",
        top: 130, left: 130, width: 120, height: 120,
        borderRadius: "50%",
        background: "var(--wf-forest)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        boxShadow: "var(--wf-shadow-lg)",
      }}>
        <Image src="/WedFlowlogo.png" alt="WedFlow" width={36} height={36} style={{ marginBottom: 4 }} />
        <span className="wf-serif" style={{ fontSize: 12, color: "var(--wf-cream)", textAlign: "center", lineHeight: 1.2 }}>
          You and<br />your partner
        </span>
      </div>
      {/* Floating labels */}
      <span style={{ position: "absolute", top: 12, left: 100, fontSize: 11, padding: "4px 10px", borderRadius: 12, background: "rgba(28,59,43,0.06)", color: "var(--wf-ink-45)" }}>
        &ldquo;Dress code?&rdquo;
      </span>
      <span style={{ position: "absolute", bottom: 20, right: 30, fontSize: 11, padding: "4px 10px", borderRadius: 12, background: "rgba(28,59,43,0.06)", color: "var(--wf-ink-45)" }}>
        &ldquo;Parking?&rdquo;
      </span>
      <span style={{ position: "absolute", top: 70, right: 10, fontSize: 11, padding: "4px 10px", borderRadius: 12, background: "rgba(123,145,116,0.15)", color: "#4a6844" }}>
        MOH coordinating
      </span>
      <span style={{ position: "absolute", bottom: 60, left: 0, fontSize: 11, padding: "4px 10px", borderRadius: 12, background: "rgba(232,179,154,0.25)", color: "#8a5a3a" }}>
        Mom, handling it
      </span>
    </div>
  );
}

// ─── Hero ──────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section style={{ background: "var(--wf-cream)", paddingTop: 96, paddingBottom: 120 }}>
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "0 40px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.15fr 1fr", gap: 80, alignItems: "center" }}>
          <div className="animate-fade-in-up">
            <span className="wf-eyebrow">Your Circle of Care</span>
            <h1 className="wf-serif" style={{
              fontSize: "clamp(48px, 6vw, 80px)",
              lineHeight: 1.08,
              color: "var(--wf-forest)",
              margin: "32px 0 28px",
              letterSpacing: "-0.02em",
              fontWeight: 500,
            }}>
              Your wedding takes<br />
              <em style={{ fontWeight: 500, color: "var(--wf-terracotta)" }}>a village.</em><br />
              We help you tend it.
            </h1>
            <p className="wf-sans animate-fade-in-up-delay" style={{ fontSize: 17, lineHeight: 1.7, color: "var(--wf-ink-60)", maxWidth: 460, marginBottom: 40 }}>
              Guests text with questions. Your maid of honor coordinates the bridesmaids. Your mom handles the family dynamics. WedFlow keeps all of it moving so you can be present for what matters.
            </p>
            <div className="animate-fade-in-up-delay-2">
              <EmailCapture />
              <p className="wf-sans" style={{ fontSize: 12, color: "var(--wf-ink-45)", marginTop: 12 }}>
                Paid beta · limited spots · we&apos;ll reach out with pricing.
              </p>
            </div>
          </div>
          <div className="animate-fade-in-up-delay">
            <CircleDiagram />
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Social Proof Bar ──────────────────────────────────────────────────────────

function SocialProofBar() {
  return (
    <div style={{ background: "var(--wf-cream)", borderTop: "1px solid var(--wf-line)", borderBottom: "1px solid var(--wf-line)", padding: "22px 0", textAlign: "center" }}>
      <p className="wf-serif" style={{ fontSize: 15, color: "var(--wf-ink-45)", fontStyle: "italic", letterSpacing: "0.01em" }}>
        The emotional buffer between you and the people who love you most. Trusted by couples across Canada.
      </p>
    </div>
  );
}

// ─── How It Works ──────────────────────────────────────────────────────────────

function HowItWorks() {
  const steps = [
    {
      num: "01",
      title: "Guests text, WedFlow answers",
      body: "Dress code, parking, venue, registry. Guests text one number and get an instant reply in your voice. No app to download.",
    },
    {
      num: "02",
      title: "Your circle coordinates",
      body: "Your maid of honor, best man, and family get their own dashboard. They see their tasks, handle their people, and keep you out of the weeds.",
    },
    {
      num: "03",
      title: "Hard things, held gently",
      body: "When a guest shares something emotional, WedFlow holds it. It drafts a reply and waits for you, or hands it to someone you trust.",
    },
  ];

  return (
    <section id="how-it-works" style={{ background: "var(--wf-forest)", padding: "120px 40px" }}>
      <div style={{ maxWidth: 1160, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 80, alignItems: "end", marginBottom: 80 }}>
          <div>
            <span className="wf-eyebrow wf-eyebrow-forest">How your people are cared for</span>
            <h2 className="wf-serif" style={{ fontSize: "clamp(40px, 5vw, 60px)", lineHeight: 1.05, color: "var(--wf-cream)", margin: "24px 0 0", fontWeight: 500, letterSpacing: "-0.02em" }}>
              Every person,<br />
              <em style={{ fontWeight: 400 }}>tended to.</em>
            </h2>
          </div>
          <p className="wf-sans" style={{ fontSize: 16, color: "var(--wf-cream-ink)", lineHeight: 1.7, maxWidth: 460, justifySelf: "end" }}>
            Ten minutes to set up. From that moment, every guest question gets a thoughtful reply. Every task lands in the right hands. Every hard conversation is held with care.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1, background: "rgba(253,251,247,0.08)" }}>
          {steps.map((s, i) => (
            <div key={i} style={{ background: "var(--wf-forest)", padding: "48px 40px", minHeight: 280 }}>
              <div className="wf-serif" style={{ fontSize: 72, color: "var(--wf-terracotta)", lineHeight: 1, fontStyle: "italic", fontWeight: 500, marginBottom: 32, letterSpacing: "-0.02em" }}>
                {s.num}
              </div>
              <h3 className="wf-serif" style={{ fontSize: 22, color: "var(--wf-cream)", fontWeight: 600, marginBottom: 12, lineHeight: 1.3 }}>
                {s.title}
              </h3>
              <p className="wf-sans" style={{ fontSize: 14, color: "var(--wf-cream-ink)", lineHeight: 1.65 }}>
                {s.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Features ──────────────────────────────────────────────────────────────────

function Features() {
  const features = [
    {
      title: "Guests get answers instantly",
      body: "Dress code, venue, parking, registry. Your guests text one number. WedFlow replies in your voice, instantly. No app for them to download, no group chat to manage.",
      accent: "In your voice, always.",
    },
    {
      title: "Your inner circle gets real tools",
      body: "Your maid of honor, best man, and family leads each get their own view. They see what belongs to them, handle their tasks, and keep you out of the details.",
      accent: "Everyone knows their part.",
    },
    {
      title: "Hard things, held with care",
      body: "When a guest shares something emotional, WedFlow recognizes it. It pauses, drafts something thoughtful, and holds it for you, or passes it to someone you trust.",
      accent: "Care, not automation.",
    },
    {
      title: "Ten minutes to set up. That is it.",
      body: "Share your wedding details once. Invite your circle. From that moment, every question, every task, every sensitive message is tended to.",
      accent: "One setup, always on.",
    },
  ];

  return (
    <section id="features" style={{ background: "var(--wf-cream)", padding: "120px 40px" }}>
      <div style={{ maxWidth: 1160, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 72 }}>
          <span className="wf-eyebrow wf-eyebrow-centered">What&apos;s included</span>
          <h2 className="wf-serif" style={{ fontSize: "clamp(40px, 5vw, 62px)", lineHeight: 1.05, color: "var(--wf-forest)", margin: "24px 0 0", fontWeight: 500, letterSpacing: "-0.02em" }}>
            Everything your circle<br />
            <em style={{ fontWeight: 500 }}>needs.</em>
          </h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 24 }}>
          {features.map((f, i) => (
            <div
              key={i}
              style={{ background: "var(--wf-paper)", borderRadius: 20, padding: "36px 36px 32px", border: "1px solid var(--wf-line)", position: "relative", overflow: "hidden", transition: "all 0.25s" }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "var(--wf-shadow-lg)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
            >
              <h3 className="wf-serif" style={{ fontSize: 22, fontWeight: 600, color: "var(--wf-forest)", marginBottom: 10, lineHeight: 1.3 }}>
                {f.title}
              </h3>
              <p className="wf-sans" style={{ fontSize: 14.5, color: "var(--wf-ink-60)", lineHeight: 1.65, marginBottom: 14 }}>
                {f.body}
              </p>
              <em className="wf-serif" style={{ fontSize: 13, color: "var(--wf-terracotta-deep)" }}>
                — {f.accent}
              </em>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Testimonial ───────────────────────────────────────────────────────────────

function Testimonial() {
  return (
    <section style={{ background: "var(--wf-forest)", padding: "140px 40px", position: "relative", overflow: "hidden" }}>
      <div className="wf-serif" style={{ position: "absolute", top: 40, left: "50%", transform: "translateX(-50%)", fontSize: 120, color: "var(--wf-terracotta)", lineHeight: 1, fontStyle: "italic", fontWeight: 500, opacity: 0.9 }}>
        &ldquo;
      </div>
      <div style={{ maxWidth: 920, margin: "0 auto", textAlign: "center", paddingTop: 50 }}>
        <blockquote className="wf-serif" style={{ fontSize: "clamp(24px, 3vw, 38px)", lineHeight: 1.35, color: "var(--wf-cream)", margin: "0 0 48px", fontWeight: 400, fontStyle: "italic", letterSpacing: "-0.01em" }}>
          We stopped answering the same question 40 times. Wedflow handled it — and our guests loved how thoughtful the replies felt.
        </blockquote>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
          <span style={{ width: 32, height: 1, background: "var(--wf-terracotta)" }} />
          <cite className="wf-sans" style={{ fontSize: 13, color: "var(--wf-cream-ink)", fontStyle: "normal", letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 500 }}>
            Alex &amp; Kirsten · July 2026
          </cite>
          <span style={{ width: 32, height: 1, background: "var(--wf-terracotta)" }} />
        </div>
      </div>
    </section>
  );
}

// ─── Final CTA ─────────────────────────────────────────────────────────────────

function FinalCTA() {
  return (
    <section style={{ background: "var(--wf-cream)", padding: "140px 40px 160px" }}>
      <div style={{ maxWidth: 760, margin: "0 auto", textAlign: "center" }}>
        {/* Ornamental divider */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 40 }}>
          <span style={{ width: 40, height: 1, background: "var(--wf-line-strong)" }} />
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--wf-terracotta)" }} />
          <span style={{ width: 40, height: 1, background: "var(--wf-line-strong)" }} />
        </div>
        <h2 className="wf-serif" style={{ fontSize: "clamp(40px, 6vw, 72px)", lineHeight: 1.05, color: "var(--wf-forest)", margin: "0 0 24px", fontWeight: 500, letterSpacing: "-0.02em" }}>
          Your celebration deserves<br />
          <em style={{ fontWeight: 500 }}>your full attention.</em>
        </h2>
        <p className="wf-sans" style={{ fontSize: 17, color: "var(--wf-ink-60)", marginBottom: 40, lineHeight: 1.65 }}>
          Let WedFlow tend to your village. You tend to each other.
        </p>
        <Link href="/sign-up" className="wf-btn wf-btn-primary wf-btn-lg" style={{ padding: "16px 36px", fontSize: 14 }}>
          Begin Your Journey →
        </Link>
      </div>
    </section>
  );
}

// ─── Footer ────────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer style={{ background: "var(--wf-forest-deep)", padding: "48px 40px" }}>
      <div style={{ maxWidth: 1160, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 32, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 112, height: 112, borderRadius: '22%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Image src="/LogoDark.png" alt="Wedflow" width={180} height={180} style={{ width: 180, height: 180, objectFit: 'contain', flexShrink: 0 }} />
          </div>
          <span className="wf-serif" style={{ fontSize: 18, color: "var(--wf-cream)", fontWeight: 600 }}>Wedflow</span>
          <span className="wf-sans" style={{ fontSize: 12, color: "var(--wf-cream-ink-50)", marginLeft: 8 }}>
            Made with care for couples everywhere.
          </span>
        </div>
        <div style={{ display: "flex", gap: 28, fontSize: 12 }}>
          <Link href="/sign-in" className="wf-sans" style={{ color: "var(--wf-cream-ink-50)", textDecoration: "none" }}>Sign in</Link>
          <a href="#" className="wf-sans" style={{ color: "var(--wf-cream-ink-50)", textDecoration: "none" }}>Pricing</a>
          <a href="#" className="wf-sans" style={{ color: "var(--wf-cream-ink-50)", textDecoration: "none" }}>Privacy</a>
          <a href="#" className="wf-sans" style={{ color: "var(--wf-cream-ink-50)", textDecoration: "none" }}>Contact</a>
        </div>
      </div>
    </footer>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--wf-cream)" }}>
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
