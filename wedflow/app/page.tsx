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

// ─── Hero phone mockup ─────────────────────────────────────────────────────────

function HeroPhone() {
  return (
    <div style={{ position: "relative", height: 560 }}>
      {/* Background tilt card */}
      <div style={{
        position: "absolute",
        inset: "20px 40px",
        background: "var(--wf-cream-warm)",
        borderRadius: 32,
        border: "1px solid var(--wf-line)",
        transform: "rotate(-1.5deg)",
      }} />
      {/* Phone frame */}
      <div style={{
        position: "absolute",
        inset: "0 60px",
        background: "var(--wf-forest-deep)",
        borderRadius: 48,
        padding: 10,
        boxShadow: "var(--wf-shadow-xl), 0 0 0 1px rgba(28,59,43,0.1)",
      }}>
        <div style={{
          background: "var(--wf-cream)",
          borderRadius: 40,
          height: "100%",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}>
          {/* Status bar */}
          <div style={{ padding: "14px 24px 10px", fontSize: 11, color: "var(--wf-forest)", display: "flex", justifyContent: "space-between", fontWeight: 600 }}>
            <span>9:41</span>
            <span>●●●</span>
          </div>
          {/* Contact header */}
          <div style={{ padding: "10px 24px 14px", borderBottom: "1px solid var(--wf-line)", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 104, height: 104, borderRadius: 10, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Image src="/LogoLight.png" alt="Wedflow" width={168} height={168} style={{ width: 168, height: 168, objectFit: 'contain', flexShrink: 0 }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--wf-forest)" }}>Wedflow · Alex &amp; Kirsten</div>
              <div style={{ fontSize: 10.5, color: "var(--wf-ink-45)" }}>+1 (825) 465-4504</div>
            </div>
            <span style={{ display: "flex", gap: 4, alignItems: "center", fontSize: 10, color: "var(--wf-sage)", fontWeight: 500 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--wf-sage)" }} />
              Live
            </span>
          </div>
          {/* Messages */}
          <div style={{ flex: 1, padding: "18px 18px 8px", display: "flex", flexDirection: "column", gap: 12, overflow: "hidden" }}>
            <div style={{ alignSelf: "flex-start", maxWidth: "78%" }}>
              <div style={{ fontSize: 10, color: "var(--wf-ink-45)", marginBottom: 4, marginLeft: 10 }}>Sarah · 9:14</div>
              <div style={{ background: "var(--wf-paper)", border: "1px solid var(--wf-line)", padding: "10px 14px", borderRadius: 16, borderTopLeftRadius: 4, fontSize: 13, color: "var(--wf-ink)", boxShadow: "var(--wf-shadow-sm)" }}>
                What&apos;s the dress code? 👗
              </div>
            </div>
            <div style={{ alignSelf: "flex-end", maxWidth: "82%" }}>
              <div style={{ fontSize: 10, color: "var(--wf-ink-45)", marginBottom: 4, textAlign: "right", marginRight: 10 }}>Wedflow · auto-replied</div>
              <div style={{ background: "var(--wf-forest)", color: "var(--wf-cream)", padding: "10px 14px", borderRadius: 16, borderTopRightRadius: 4, fontSize: 13, boxShadow: "0 4px 12px rgba(28,59,43,0.16)", lineHeight: 1.45 }}>
                Garden formal — florals and linens very welcome! 🌿
              </div>
            </div>
            <div style={{ alignSelf: "flex-start", maxWidth: "78%" }}>
              <div style={{ fontSize: 10, color: "var(--wf-ink-45)", marginBottom: 4, marginLeft: 10 }}>James · 9:31</div>
              <div style={{ background: "var(--wf-paper)", border: "1px solid var(--wf-line)", padding: "10px 14px", borderRadius: 16, borderTopLeftRadius: 4, fontSize: 13, color: "var(--wf-ink)", boxShadow: "var(--wf-shadow-sm)" }}>
                Is there parking nearby? 🚗
              </div>
            </div>
            <div style={{ alignSelf: "flex-end", maxWidth: "82%" }}>
              <div style={{ fontSize: 10, color: "var(--wf-ink-45)", marginBottom: 4, textAlign: "right", marginRight: 10 }}>Wedflow · auto-replied</div>
              <div style={{ background: "var(--wf-forest)", color: "var(--wf-cream)", padding: "10px 14px", borderRadius: 16, borderTopRightRadius: 4, fontSize: 13, boxShadow: "0 4px 12px rgba(28,59,43,0.16)", lineHeight: 1.45 }}>
                Free parking in Lot C — just east of the main entrance.
              </div>
            </div>
            {/* Sensitive — held */}
            <div style={{ alignSelf: "flex-start", maxWidth: "82%", marginTop: 4 }}>
              <div style={{ fontSize: 10, color: "var(--wf-terracotta-deep)", marginBottom: 4, marginLeft: 10, display: "flex", gap: 6, alignItems: "center" }}>
                🛡 Held for your review
              </div>
              <div style={{ background: "var(--wf-cream-warm)", border: "1.5px dashed var(--wf-terracotta-soft)", padding: "10px 14px", borderRadius: 16, borderTopLeftRadius: 4, fontSize: 12.5, color: "var(--wf-ink-60)", fontStyle: "italic", lineHeight: 1.45 }}>
                &ldquo;Actually, I don&apos;t know how to say this but…&rdquo;
              </div>
            </div>
          </div>
          {/* Compose bar */}
          <div style={{ padding: "10px 14px 14px", borderTop: "1px solid var(--wf-line)" }}>
            <div style={{ background: "var(--wf-cream-warm)", borderRadius: 999, padding: "9px 16px", fontSize: 12, color: "var(--wf-ink-45)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              iMessage
              <span>↗</span>
            </div>
          </div>
        </div>
      </div>
      {/* Floating stat card */}
      <div style={{
        position: "absolute", top: 30, right: -10,
        background: "var(--wf-paper)", border: "1px solid var(--wf-line)",
        borderRadius: 12, padding: "10px 14px", boxShadow: "var(--wf-shadow-md)",
        fontSize: 11, display: "flex", alignItems: "center", gap: 8,
        transform: "rotate(3deg)",
      }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--wf-sage)" }} />
        <span style={{ color: "var(--wf-ink-60)" }}>14 auto-replied today</span>
      </div>
      {/* Floating tag */}
      <div style={{
        position: "absolute", bottom: 50, left: -20,
        background: "var(--wf-forest)", color: "var(--wf-cream)",
        borderRadius: 12, padding: "10px 14px", boxShadow: "var(--wf-shadow-lg)",
        fontSize: 11, display: "flex", alignItems: "center", gap: 8,
        transform: "rotate(-4deg)",
      }}>
        ✦ <span>In your voice, always</span>
      </div>
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
            <span className="wf-eyebrow">The Wedding Concierge</span>
            <h1 className="wf-serif" style={{
              fontSize: "clamp(56px, 7vw, 96px)",
              lineHeight: 1.02,
              color: "var(--wf-forest)",
              margin: "32px 0 28px",
              letterSpacing: "-0.02em",
              fontWeight: 600,
            }}>
              Your guests<br />
              have <em style={{ fontWeight: 500 }}>something</em><br />
              <em style={{ fontWeight: 500 }}>to say.</em>
            </h1>
            <p className="wf-sans animate-fade-in-up-delay" style={{ fontSize: 17, lineHeight: 1.65, color: "var(--wf-ink-60)", maxWidth: 480, marginBottom: 40 }}>
              Wedflow is the first inbound AI SMS concierge built for weddings. Your guests text a dedicated number with questions — and the things they can&apos;t say to your face. The AI replies in your voice, and holds the sensitive ones for your eyes only.
            </p>
            <div className="animate-fade-in-up-delay-2">
              <EmailCapture />
              <p className="wf-sans" style={{ fontSize: 12, color: "var(--wf-ink-45)", marginTop: 12 }}>
                Paid beta · limited spots · we&apos;ll reach out with pricing.
              </p>
            </div>
          </div>
          <div className="animate-fade-in-up-delay">
            <HeroPhone />
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
        The emotional buffer for what guests can&apos;t say directly — trusted by couples across Canada.
      </p>
    </div>
  );
}

// ─── How It Works ──────────────────────────────────────────────────────────────

function HowItWorks() {
  const steps = [
    {
      num: "01",
      title: "Guests text your WedFlow number",
      body: "Questions, RSVPs, dietary restrictions — and the things they can't say to your face. Everything comes to one place.",
    },
    {
      num: "02",
      title: "AI replies in your voice, instantly",
      body: "Logistics and FAQs get warm, accurate responses that sound like you. No more 2 a.m. interruptions.",
    },
    {
      num: "03",
      title: "Sensitive messages? Escalated to you",
      body: "When a guest shares something emotional, it's quietly held for your review — with a thoughtful draft ready.",
    },
  ];

  return (
    <section id="how-it-works" style={{ background: "var(--wf-forest)", padding: "120px 40px" }}>
      <div style={{ maxWidth: 1160, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 80, alignItems: "end", marginBottom: 80 }}>
          <div>
            <span className="wf-eyebrow wf-eyebrow-forest">How it works</span>
            <h2 className="wf-serif" style={{ fontSize: "clamp(40px, 5vw, 60px)", lineHeight: 1.05, color: "var(--wf-cream)", margin: "24px 0 0", fontWeight: 500, letterSpacing: "-0.02em" }}>
              Effortless,<br />
              <em style={{ fontWeight: 400 }}>from the first message.</em>
            </h2>
          </div>
          <p className="wf-sans" style={{ fontSize: 16, color: "var(--wf-cream-ink)", lineHeight: 1.7, maxWidth: 460, justifySelf: "end" }}>
            Three steps. Ten minutes to set up. And the calm of knowing every guest question has a thoughtful reply — even the ones that matter most.
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
      title: "A calm centre for guest inquiries",
      body: "Dress code, venue directions, parking, registry — your concierge handles the questions guests ask dozens of times, so you never have to.",
      accent: "Handles repeats.",
    },
    {
      title: "Drafted replies, in your voice",
      body: "When a message calls for your personal touch, Wedflow prepares a thoughtful reply for your review. Approve, edit, or send as-is.",
      accent: "Always on-brand.",
    },
    {
      title: "Sensitive messages, kept private",
      body: "If a guest opens up about something emotional, the AI recognizes it, pauses, and escalates it quietly — with a draft ready for you.",
      accent: "Discretion built-in.",
    },
    {
      title: "Set up in ten minutes",
      body: "Share your wedding details once during a guided onboarding. From that moment, your concierge is ready — no maintenance required.",
      accent: "Ten minutes, once.",
    },
  ];

  return (
    <section id="features" style={{ background: "var(--wf-cream)", padding: "120px 40px" }}>
      <div style={{ maxWidth: 1160, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 72 }}>
          <span className="wf-eyebrow wf-eyebrow-centered">What&apos;s included</span>
          <h2 className="wf-serif" style={{ fontSize: "clamp(40px, 5vw, 62px)", lineHeight: 1.05, color: "var(--wf-forest)", margin: "24px 0 0", fontWeight: 500, letterSpacing: "-0.02em" }}>
            Everything your day<br />
            <em style={{ fontWeight: 500 }}>deserves.</em>
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
          Let Wedflow hold the questions. You hold each other.
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
