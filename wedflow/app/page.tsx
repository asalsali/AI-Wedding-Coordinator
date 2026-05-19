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
    <div style={{ maxWidth: 460, width: "100%" }}>
      <form onSubmit={handleSubmit} className="wf-email-form">
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
      <div className="wf-nav-inner">
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <div style={{ width: 40, height: 40, borderRadius: '22%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Image src="/LogoLight.png" alt="Wedflow" width={40} height={40} style={{ width: 40, height: 40, objectFit: 'contain', flexShrink: 0 }} priority />
          </div>
          <span className="wf-serif" style={{ fontSize: 18, fontWeight: 600, color: "var(--wf-forest)", letterSpacing: "-0.01em" }}>
            Wedflow
          </span>
        </Link>

        {/* Desktop nav links */}
        <div className="wf-nav-desktop">
          <a href="#how-it-works" className="wf-sans" style={{ color: "var(--wf-ink-60)", textDecoration: "none" }}>How it works</a>
          <a href="#features" className="wf-sans" style={{ color: "var(--wf-ink-60)", textDecoration: "none" }}>Features</a>
          {isSignedIn ? (
            <Link href="/dashboard" className="wf-btn wf-btn-forest">Go to Dashboard →</Link>
          ) : (
            <>
              <Link href="/partner-login" className="wf-sans" style={{ color: "var(--wf-ink-45)", textDecoration: "none", fontSize: 13 }}>Partner Login</Link>
              <Link href="/sign-in" className="wf-sans" style={{ color: "var(--wf-ink-60)", textDecoration: "none" }}>Sign in</Link>
              <Link href="/sign-up" className="wf-btn wf-btn-primary">Get Started →</Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button className="wf-nav-mobile-toggle" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Toggle menu">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--wf-forest)" strokeWidth="2" strokeLinecap="round">
            {mobileMenuOpen ? (
              <><line x1="6" y1="6" x2="18" y2="18" /><line x1="6" y1="18" x2="18" y2="6" /></>
            ) : (
              <><line x1="4" y1="7" x2="20" y2="7" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="17" x2="20" y2="17" /></>
            )}
          </svg>
        </button>
      </div>

      {/* Mobile dropdown */}
      {mobileMenuOpen && (
        <div className="wf-nav-mobile-menu">
          <a href="#how-it-works" className="wf-sans" onClick={() => setMobileMenuOpen(false)}>How it works</a>
          <a href="#features" className="wf-sans" onClick={() => setMobileMenuOpen(false)}>Features</a>
          {isSignedIn ? (
            <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)}>Go to Dashboard →</Link>
          ) : (
            <>
              <Link href="/partner-login" style={{ color: "var(--wf-ink-45)", fontSize: 13 }} onClick={() => setMobileMenuOpen(false)}>Partner Login</Link>
              <Link href="/sign-in" onClick={() => setMobileMenuOpen(false)}>Sign in</Link>
              <Link href="/sign-up" className="wf-btn wf-btn-primary" style={{ textAlign: "center" }} onClick={() => setMobileMenuOpen(false)}>Get Started →</Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}

// ─── Circle Diagram ───────────────────────────────────────────────────────────

function CircleDiagram() {
  const cx = 200, cy = 200;

  // Role nodes positioned around the middle ring
  const roles = [
    { label: "MOH", angle: -60, color: "#7B9174" },
    { label: "Best Man", angle: 20, color: "#7B9174" },
    { label: "Mom", angle: 100, color: "#C4714A" },
    { label: "Dad", angle: 180, color: "#C4714A" },
    { label: "Bridesmaid", angle: -130, color: "#7B9174" },
  ];

  // Guest message bubbles on the outer ring
  const guests = [
    { text: "Dress code?", angle: -40 },
    { text: "Parking?", angle: 50 },
    { text: "Registry?", angle: 160 },
    { text: "Hotel?", angle: -150 },
  ];

  // Vendor message bubbles on the outer ring (distinct color)
  const vendors = [
    { text: "Timeline?", angle: 95 },
    { text: "Setup time?", angle: -95 },
    { text: "Delivery addr?", angle: -10 },
    { text: "Song list?", angle: 200 },
  ];

  return (
    <div style={{ position: "relative", width: "100%", maxWidth: 400, aspectRatio: "1", margin: "0 auto" }}>
      <svg viewBox="0 0 400 400" width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
        {/* Outer ring: guests + vendors */}
        <circle cx={cx} cy={cy} r={185} fill="none" stroke="var(--wf-line-strong)" strokeWidth="1.5" strokeDasharray="6 4" opacity={0.6} />
        {/* Ring labels */}
        <text x={cx - 60} y={24} textAnchor="middle" fill="var(--wf-ink-25)" fontSize="9" fontFamily="var(--wf-sans)" letterSpacing="0.12em" style={{ textTransform: "uppercase" } as React.CSSProperties}>GUESTS</text>
        <text x={cx + 60} y={24} textAnchor="middle" fill="#C4714A" fontSize="9" fontFamily="var(--wf-sans)" letterSpacing="0.12em" opacity={0.7} style={{ textTransform: "uppercase" } as React.CSSProperties}>VENDORS</text>

        {/* Middle ring: inner circle */}
        <circle cx={cx} cy={cy} r={120} fill="rgba(123,145,116,0.04)" stroke="rgba(123,145,116,0.3)" strokeWidth="1.5" />
        {/* Ring label */}
        <text x={cx} y={92} textAnchor="middle" fill="rgba(123,145,116,0.5)" fontSize="9" fontFamily="var(--wf-sans)" letterSpacing="0.12em" style={{ textTransform: "uppercase" } as React.CSSProperties}>YOUR WEDDING</text>

        {/* Center: couple */}
        <circle cx={cx} cy={cy} r={48} fill="#1C3B2B" />
        <text x={cx} y={cy - 4} textAnchor="middle" fill="#FDFBF7" fontSize="13" fontFamily="var(--wf-serif)" fontWeight="500">You &amp;</text>
        <text x={cx} y={cy + 14} textAnchor="middle" fill="#FDFBF7" fontSize="13" fontFamily="var(--wf-serif)" fontWeight="500">Partner</text>

        {/* Connection lines from couple to circle members */}
        {roles.map((role, i) => {
          const rad = (role.angle * Math.PI) / 180;
          const rx = cx + Math.cos(rad) * 120;
          const ry = cy + Math.sin(rad) * 120;
          return (
            <line key={`line-${i}`} x1={cx} y1={cy} x2={rx} y2={ry} stroke="rgba(123,145,116,0.15)" strokeWidth="1" />
          );
        })}

        {/* Role nodes */}
        {roles.map((role, i) => {
          const rad = (role.angle * Math.PI) / 180;
          const rx = cx + Math.cos(rad) * 120;
          const ry = cy + Math.sin(rad) * 120;
          return (
            <g key={`role-${i}`}>
              <circle cx={rx} cy={ry} r={22} fill="white" stroke={role.color} strokeWidth="1.5" />
              <text x={rx} y={ry + 4} textAnchor="middle" fill={role.color} fontSize="9" fontFamily="var(--wf-sans)" fontWeight="600">{role.label}</text>
            </g>
          );
        })}

        {/* Guest message bubbles */}
        {guests.map((guest, i) => {
          const rad = (guest.angle * Math.PI) / 180;
          const gx = cx + Math.cos(rad) * 178;
          const gy = cy + Math.sin(rad) * 178;
          return (
            <g key={`guest-${i}`}>
              <rect x={gx - 32} y={gy - 11} width={64} height={22} rx={11} fill="rgba(28,59,43,0.07)" />
              <text x={gx} y={gy + 3.5} textAnchor="middle" fill="var(--wf-ink-45)" fontSize="9.5" fontFamily="var(--wf-sans)" fontStyle="italic">{guest.text}</text>
            </g>
          );
        })}

        {/* Vendor message bubbles (terracotta) */}
        {vendors.map((vendor, i) => {
          const rad = (vendor.angle * Math.PI) / 180;
          const vx = cx + Math.cos(rad) * 178;
          const vy = cy + Math.sin(rad) * 178;
          const textWidth = vendor.text.length * 5.5 + 20;
          const rectWidth = Math.max(64, textWidth);
          return (
            <g key={`vendor-${i}`}>
              <rect x={vx - rectWidth / 2} y={vy - 11} width={rectWidth} height={22} rx={11} fill="rgba(196,113,74,0.1)" />
              <text x={vx} y={vy + 3.5} textAnchor="middle" fill="#C4714A" fontSize="9.5" fontFamily="var(--wf-sans)" fontStyle="italic">{vendor.text}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── Hero ──────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="wf-hero">
      <div className="wf-hero-container">
        <div className="wf-hero-grid">
          <div className="animate-fade-in-up">
            <span className="wf-eyebrow">The First AI Wedding Secretary</span>
            <h1 className="wf-serif wf-hero-title">
              Every text handled.<br />
              <em style={{ fontWeight: 500, color: "var(--wf-terracotta)" }}>Every detail covered.</em><br />
              You stay present.
            </h1>
            <p className="wf-sans animate-fade-in-up-delay wf-hero-subtitle">
              Guests text one number with questions about dress code, parking, and registry. Vendors confirm timelines. WedFlow answers instantly in your voice, coordinates your people, and flags anything that needs your personal touch.
            </p>
            <div className="animate-fade-in-up-delay-2 wf-hero-email">
              <EmailCapture />
              <p className="wf-sans" style={{ fontSize: 12, color: "var(--wf-ink-45)", marginTop: 12 }}>
                Paid beta · limited spots · we&apos;ll reach out with pricing.
              </p>
            </div>
          </div>
          <div className="animate-fade-in-up-delay wf-hero-diagram" style={{ position: "relative" }}>
            <div style={{ position: "relative", width: "100%", aspectRatio: "3/4", maxWidth: 480, margin: "0 auto", borderRadius: 24, overflow: "hidden", boxShadow: "0 24px 64px rgba(28,59,43,0.12)" }}>
              <Image
                src="/photos/hands-detail.jpg"
                alt="Couple holding hands on the beach at sunset, engagement ring visible"
                fill
                style={{ objectFit: "cover", objectPosition: "center 30%" }}
                priority
                sizes="(max-width: 768px) 100vw, 480px"
              />
            </div>
            <p className="wf-serif" style={{ textAlign: "center", fontSize: 13, color: "var(--wf-ink-45)", fontStyle: "italic", marginTop: 14, letterSpacing: "0.01em" }}>
              That&apos;s us, after letting WedFlow handle everything.
            </p>
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
        Your guests get instant answers. Your vendors stay in sync. You stay present. Trusted by couples across Canada.
      </p>
    </div>
  );
}

// ─── How It Works ──────────────────────────────────────────────────────────────

function HowItWorks() {
  const steps = [
    {
      num: "01",
      title: "Guests and vendors text, WedFlow answers",
      body: "Guests ask about dress code, parking, and registry. Your photographer confirms the timeline. Your DJ sends the song list. One number handles all of it, in your voice. No app to download.",
    },
    {
      num: "02",
      title: "Your people see what they need",
      body: "Your maid of honor, best man, and family each get their own view. Vendors stay in the loop on timelines and logistics. Everyone sees what belongs to them and nothing more.",
    },
    {
      num: "03",
      title: "Sensitive messages, held for you",
      body: "When a guest shares something emotional, WedFlow pauses. It drafts a reply in your voice and waits for you to review, or passes it to someone you trust.",
    },
  ];

  return (
    <section id="how-it-works" className="wf-how-section">
      <div className="wf-how-inner">
        <div className="wf-how-header">
          <div>
            <span className="wf-eyebrow wf-eyebrow-forest">How your secretary works</span>
            <h2 className="wf-serif" style={{ fontSize: "clamp(32px, 5vw, 60px)", lineHeight: 1.05, color: "var(--wf-cream)", margin: "24px 0 0", fontWeight: 500, letterSpacing: "-0.02em" }}>
              Every detail,<br />
              <em style={{ fontWeight: 400 }}>handled.</em>
            </h2>
          </div>
          <p className="wf-sans" style={{ fontSize: 16, color: "var(--wf-cream-ink)", lineHeight: 1.7, maxWidth: 460 }}>
            Ten minutes to set up. From that moment, every guest question gets an instant reply. Every vendor request lands in the right hands. Every sensitive message is held for you.
          </p>
        </div>

        <div className="wf-how-steps">
          {steps.map((s, i) => {
            const conversations = [
              [
                { from: "guest", text: "Hey! What\u2019s the dress code for Saturday?" },
                { from: "wedflow", text: "Hi! It\u2019s cocktail attire \u2014 think a nice dress or slacks and a blazer. The ceremony is outdoors on grass, so avoid stilettos! Let us know if you have any other questions." },
              ],
              [
                { from: "vendor", text: "What time should we arrive for setup on Saturday?" },
                { from: "wedflow", text: "Setup access starts at 2pm. The ceremony is at 5pm, so you\u2019ll have three hours. The venue contact is Maria \u2014 she\u2019ll meet you at the side entrance." },
              ],
              [
                { from: "guest", text: "I\u2019m not sure I can make it anymore. Things have been really hard lately." },
                { from: "wedflow", label: "Held for your review", text: "I\u2019m so sorry to hear that. We completely understand, and there\u2019s no pressure at all. Just know you\u2019re loved and we\u2019re thinking of you." },
              ],
            ];
            const convo = conversations[i];
            return (
              <div key={i} className="wf-how-step" style={{ padding: "0" }}>
                {/* SMS preview */}
                <div style={{ padding: "28px 24px 20px", borderBottom: "1px solid rgba(253,251,247,0.08)" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {convo.map((msg, j) => (
                      <div key={j} style={{ display: "flex", flexDirection: "column", alignItems: msg.from === "guest" || msg.from === "vendor" ? "flex-start" : "flex-end", gap: 4 }}>
                        {msg.from !== "wedflow" && (
                          <span className="wf-sans" style={{ fontSize: 10, color: "var(--wf-cream-ink-50)", fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase", padding: "0 8px" }}>
                            {msg.from === "vendor" ? "Vendor" : "Guest"}
                          </span>
                        )}
                        {msg.from === "wedflow" && "label" in msg && (
                          <span className="wf-sans" style={{ fontSize: 10, color: "var(--wf-terracotta)", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", padding: "0 8px", display: "flex", alignItems: "center", gap: 4 }}>
                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--wf-terracotta)" }} />
                            {msg.label}
                          </span>
                        )}
                        {msg.from === "wedflow" && !("label" in msg) && (
                          <span className="wf-sans" style={{ fontSize: 10, color: "var(--wf-sage)", fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase", padding: "0 8px" }}>
                            WedFlow
                          </span>
                        )}
                        <div style={{
                          background: msg.from === "wedflow" ? "rgba(28,59,43,0.85)" : "rgba(253,251,247,0.1)",
                          color: msg.from === "wedflow" ? "var(--wf-cream)" : "var(--wf-cream-ink)",
                          padding: "10px 14px",
                          borderRadius: 14,
                          borderTopLeftRadius: msg.from !== "wedflow" ? 4 : 14,
                          borderTopRightRadius: msg.from === "wedflow" ? 4 : 14,
                          fontSize: 13,
                          lineHeight: 1.5,
                          maxWidth: "88%",
                          fontFamily: "var(--wf-sans)",
                        }}>
                          {msg.text}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Step content */}
                <div style={{ padding: "28px 32px 36px" }}>
                  <div className="wf-serif" style={{ fontSize: 72, color: "var(--wf-terracotta)", lineHeight: 1, fontStyle: "italic", fontWeight: 500, marginBottom: 24, letterSpacing: "-0.02em" }}>
                    {s.num}
                  </div>
                  <h3 className="wf-serif" style={{ fontSize: 22, color: "var(--wf-cream)", fontWeight: 600, marginBottom: 12, lineHeight: 1.3 }}>
                    {s.title}
                  </h3>
                  <p className="wf-sans" style={{ fontSize: 14, color: "var(--wf-cream-ink)", lineHeight: 1.65 }}>
                    {s.body}
                  </p>
                </div>
              </div>
            );
          })}
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
      title: "Your wedding party gets real tools",
      body: "Your maid of honor, best man, and family leads each get their own view. They see what belongs to them, handle their tasks, and keep you out of the details.",
      accent: "Everyone knows their part.",
    },
    {
      title: "Sensitive messages, handled with care",
      body: "When a guest shares something emotional, WedFlow recognizes it. It pauses, drafts a thoughtful reply in your voice, and holds it for your review.",
      accent: "Care, not automation.",
    },
    {
      title: "Your vendors stay in sync",
      body: "Your photographer, DJ, florist, and caterer text the same number for timeline updates, delivery addresses, and setup times. No separate group chats. No lost details.",
      accent: "One number for everyone.",
    },
    {
      title: "Ten minutes to set up. That is it.",
      body: "Share your wedding details once. Invite your people. From that moment, every question, every vendor request, every sensitive message is handled.",
      accent: "One setup, always on.",
    },
  ];

  return (
    <section id="features" className="wf-features-section">
      <div className="wf-features-inner">
        <div style={{ textAlign: "center", marginBottom: 72 }}>
          <span className="wf-eyebrow wf-eyebrow-centered">What&apos;s included</span>
          <h2 className="wf-serif" style={{ fontSize: "clamp(32px, 5vw, 62px)", lineHeight: 1.05, color: "var(--wf-forest)", margin: "24px 0 0", fontWeight: 500, letterSpacing: "-0.02em" }}>
            Everything your wedding<br />
            <em style={{ fontWeight: 500 }}>needs.</em>
          </h2>
        </div>

        <div className="wf-features-grid">
          {features.map((f, i) => (
            <div key={i} className="wf-feature-card">
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
    <section className="wf-testimonial-section">
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
    <section className="wf-final-cta" style={{ position: "relative", overflow: "hidden" }}>
      {/* Background photo accent */}
      <div style={{ position: "absolute", inset: 0, opacity: 0.06 }}>
        <Image
          src="/photos/silhouette-reflection.jpg"
          alt=""
          fill
          style={{ objectFit: "cover", objectPosition: "center" }}
          sizes="100vw"
        />
      </div>
      <div style={{ maxWidth: 760, margin: "0 auto", textAlign: "center", position: "relative", zIndex: 1 }}>
        {/* Ornamental divider */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 40 }}>
          <span style={{ width: 40, height: 1, background: "var(--wf-line-strong)" }} />
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--wf-terracotta)" }} />
          <span style={{ width: 40, height: 1, background: "var(--wf-line-strong)" }} />
        </div>
        <h2 className="wf-serif" style={{ fontSize: "clamp(40px, 6vw, 72px)", lineHeight: 1.05, color: "var(--wf-forest)", margin: "0 0 24px", fontWeight: 500, letterSpacing: "-0.02em" }}>
          Your wedding day deserves<br />
          <em style={{ fontWeight: 500 }}>your full attention.</em>
        </h2>
        <p className="wf-sans" style={{ fontSize: 17, color: "var(--wf-ink-60)", marginBottom: 40, lineHeight: 1.65 }}>
          Let WedFlow handle the details. You be present for each other.
        </p>
        <Link href="/sign-up" className="wf-btn wf-btn-primary wf-btn-lg" style={{ padding: "16px 36px", fontSize: 14 }}>
          Get Started →
        </Link>
      </div>
    </section>
  );
}

// ─── Footer ────────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="wf-footer">
      <div className="wf-footer-inner">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: '22%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Image src="/LogoDark.png" alt="Wedflow" width={36} height={36} style={{ width: 36, height: 36, objectFit: 'contain', flexShrink: 0 }} />
          </div>
          <span className="wf-serif" style={{ fontSize: 16, color: "var(--wf-cream)", fontWeight: 600 }}>Wedflow</span>
          <span className="wf-sans wf-footer-tagline">
            The AI wedding secretary for couples everywhere.
          </span>
        </div>
        <div className="wf-footer-links">
          <Link href="/sign-in" className="wf-sans">Sign in</Link>
          <a href="#" className="wf-sans">Pricing</a>
          <a href="#" className="wf-sans">Privacy</a>
          <a href="#" className="wf-sans">Contact</a>
        </div>
      </div>
    </footer>
  );
}

// ─── Sticky Mobile CTA ────────────────────────────────────────────────────────

function MobileStickyBanner() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || isSubmitting) return;
    setIsSubmitting(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
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
      <div className="wf-mobile-sticky-cta">
        <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "center", padding: "8px 0" }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--wf-terracotta)", flexShrink: 0 }} />
          <p className="wf-sans" style={{ fontSize: 13, fontWeight: 500, color: "var(--wf-forest)", margin: 0 }}>
            You&apos;re on the list. We&apos;ll reach out with next steps.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="wf-mobile-sticky-cta">
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full name"
            required
            disabled={isSubmitting}
            className="wf-sans"
            style={{
              flex: 1,
              padding: "10px 14px",
              borderRadius: 999,
              border: "1px solid var(--wf-line-strong)",
              background: "var(--wf-paper)",
              fontSize: 13,
              color: "var(--wf-ink)",
              outline: "none",
              minWidth: 0,
            }}
          />
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
              padding: "10px 14px",
              borderRadius: 999,
              border: "1px solid var(--wf-line-strong)",
              background: "var(--wf-paper)",
              fontSize: 13,
              color: "var(--wf-ink)",
              outline: "none",
              minWidth: 0,
            }}
          />
        </div>
        <button type="submit" disabled={isSubmitting} className="wf-btn wf-btn-primary" style={{ width: "100%", textAlign: "center", padding: "12px 24px", fontSize: 14 }}>
          {isSubmitting ? "Submitting..." : "Request Early Access"}
        </button>
      </form>
      {errorMsg && (
        <p className="wf-sans" style={{ fontSize: 11, color: "var(--wf-terracotta)", marginTop: 4, textAlign: "center" }}>
          {errorMsg}
        </p>
      )}
    </div>
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
      <MobileStickyBanner />
    </div>
  );
}
