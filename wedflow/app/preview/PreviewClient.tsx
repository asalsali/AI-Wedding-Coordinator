"use client";

import Link from "next/link";
import SMSPreview from "@/app/components/SMSPreview";
import type { SMSMessage } from "@/app/components/SMSPreview";
import type { ToneStyle } from "@/types";

interface PreviewData {
  yourName: string;
  partnerName: string;
  tone: ToneStyle | null;
  weddingDate: string;
  venueName: string;
  venueAddress: string;
  ceremonyTime: string;
  dressCode: string;
  parkingInfo: string;
  faqs: Array<{ question: string; answer: string }>;
}

function toneAdverb(tone: ToneStyle | null): string {
  switch (tone) {
    case "warm":
      return "warmly";
    case "elegant":
      return "gracefully";
    case "playful":
      return "with personality";
    default:
      return "in your voice";
  }
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "your wedding day";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(timeStr: string): string {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(":");
  const hour = parseInt(h, 10);
  const suffix = hour >= 12 ? "pm" : "am";
  const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${display}:${m}${suffix}`;
}

function buildGuestFaqConversation(data: PreviewData): SMSMessage[] {
  // Find a FAQ with both question and answer filled in
  const faq = data.faqs.find((f) => f.question.trim() && f.answer.trim());

  if (faq) {
    return [
      { from: "guest", text: faq.question },
      { from: "wedflow", text: faq.answer },
    ];
  }

  // Fallback: use dress code if available
  if (data.dressCode) {
    return [
      { from: "guest", text: "What should we wear?" },
      {
        from: "wedflow",
        text: `The dress code is ${data.dressCode}. ${
          data.venueName
            ? `The ceremony is at ${data.venueName}, so plan accordingly.`
            : ""
        } Let us know if you have any other questions.`,
      },
    ];
  }

  // Last resort fallback
  return [
    { from: "guest", text: "What time does everything start?" },
    {
      from: "wedflow",
      text: data.ceremonyTime
        ? `The ceremony begins at ${formatTime(data.ceremonyTime)}${
            data.venueName ? ` at ${data.venueName}` : ""
          }. We can not wait to see you there.`
        : "We will get back to you with the details shortly.",
    },
  ];
}

function buildVendorConversation(data: PreviewData): SMSMessage[] {
  const ceremonyTimeStr = data.ceremonyTime
    ? formatTime(data.ceremonyTime)
    : "5pm";

  // Calculate a plausible setup time (3 hours before ceremony)
  let setupTime = "2pm";
  if (data.ceremonyTime) {
    const [h] = data.ceremonyTime.split(":");
    const hour = parseInt(h, 10);
    const setupHour = Math.max(hour - 3, 8);
    const suffix = setupHour >= 12 ? "pm" : "am";
    const display =
      setupHour > 12 ? setupHour - 12 : setupHour === 0 ? 12 : setupHour;
    setupTime = `${display}${suffix}`;
  }

  const venueDetail = data.venueName
    ? `at ${data.venueName}`
    : "at the venue";

  const parkingNote = data.parkingInfo
    ? ` ${data.parkingInfo}`
    : "";

  return [
    {
      from: "vendor",
      text: `What time should we arrive for setup on ${formatDate(data.weddingDate)}?`,
    },
    {
      from: "wedflow",
      text: `Setup access starts at ${setupTime} ${venueDetail}. The ceremony is at ${ceremonyTimeStr}, so you will have plenty of time.${
        data.venueAddress ? ` The address is ${data.venueAddress}.` : ""
      }${parkingNote ? ` For parking: ${parkingNote.trim()}` : ""}`,
    },
  ];
}

function buildSensitiveConversation(data: PreviewData): SMSMessage[] {
  const names =
    data.yourName && data.partnerName
      ? `${data.yourName} and ${data.partnerName}`
      : "you both";

  return [
    {
      from: "guest",
      text: "I am not sure I can make it anymore. Things have been really hard lately.",
    },
    {
      from: "wedflow",
      label: "Held for your review",
      text: `I am so sorry to hear that. We completely understand, and there is no pressure at all. Just know ${names} are thinking of you.`,
    },
  ];
}

interface ConversationCardProps {
  title: string;
  description: string;
  messages: SMSMessage[];
}

function ConversationCard({
  title,
  description,
  messages,
}: ConversationCardProps) {
  return (
    <div
      style={{
        background: "var(--wf-paper)",
        borderRadius: 16,
        border: "1px solid var(--wf-line)",
        overflow: "hidden",
      }}
    >
      {/* SMS bubbles */}
      <div style={{ padding: "24px 20px 16px" }}>
        <SMSPreview messages={messages} theme="light" />
      </div>

      {/* Card label */}
      <div
        style={{
          padding: "16px 20px 20px",
          borderTop: "1px solid var(--wf-line)",
        }}
      >
        <h3
          className="wf-serif"
          style={{
            fontSize: 17,
            fontWeight: 600,
            color: "var(--wf-forest)",
            margin: "0 0 4px",
            lineHeight: 1.3,
          }}
        >
          {title}
        </h3>
        <p
          className="wf-sans"
          style={{
            fontSize: 13,
            color: "var(--wf-ink-60)",
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          {description}
        </p>
      </div>
    </div>
  );
}

export default function PreviewClient({ data }: { data: PreviewData }) {
  const coupleNames =
    data.yourName && data.partnerName
      ? `${data.yourName} and ${data.partnerName}`
      : "you";

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--wf-cream)",
      }}
    >
      {/* Header */}
      <div
        style={{
          maxWidth: 640,
          margin: "0 auto",
          padding: "48px 20px 0",
          textAlign: "center",
        }}
      >
        <span
          className="wf-sans"
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--wf-terracotta)",
          }}
        >
          Your AI Wedding Secretary
        </span>
        <h1
          className="wf-serif"
          style={{
            fontSize: "clamp(28px, 5vw, 42px)",
            lineHeight: 1.15,
            color: "var(--wf-forest)",
            margin: "16px 0 0",
            fontWeight: 500,
            letterSpacing: "-0.01em",
          }}
        >
          Here is what WedFlow <br />
          <em style={{ fontWeight: 500 }}>does for {coupleNames}</em>
        </h1>
        <p
          className="wf-sans"
          style={{
            fontSize: 15,
            color: "var(--wf-ink-60)",
            margin: "16px 0 0",
            lineHeight: 1.6,
          }}
        >
          These conversations are built from the details you just shared.
          Your secretary replies {toneAdverb(data.tone)}, handles logistics,
          and holds sensitive messages for you.
        </p>
      </div>

      {/* Conversation cards */}
      <div
        style={{
          maxWidth: 640,
          margin: "0 auto",
          padding: "36px 20px 0",
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        <ConversationCard
          title="Guest questions, answered instantly"
          description="When a guest texts your wedding number, WedFlow replies with the answers you provided during setup. No app for them to download."
          messages={buildGuestFaqConversation(data)}
        />

        <ConversationCard
          title="Vendor coordination, on autopilot"
          description="Vendors text the same number for setup times, addresses, and logistics. Your secretary keeps them informed without you lifting a finger."
          messages={buildVendorConversation(data)}
        />

        <ConversationCard
          title="Sensitive messages, held for you"
          description="When a guest shares something emotional, WedFlow pauses. It drafts a reply in your voice and waits for you to send it."
          messages={buildSensitiveConversation(data)}
        />
      </div>

      {/* CTA section */}
      <div
        style={{
          maxWidth: 640,
          margin: "0 auto",
          padding: "48px 20px 64px",
          textAlign: "center",
        }}
      >
        {/* Ornamental divider */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            marginBottom: 32,
          }}
        >
          <span
            style={{
              width: 40,
              height: 1,
              background: "var(--wf-line-strong)",
            }}
          />
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "var(--wf-terracotta)",
            }}
          />
          <span
            style={{
              width: 40,
              height: 1,
              background: "var(--wf-line-strong)",
            }}
          />
        </div>

        <p
          className="wf-serif"
          style={{
            fontSize: "clamp(20px, 4vw, 28px)",
            color: "var(--wf-forest)",
            fontWeight: 500,
            margin: "0 0 8px",
            lineHeight: 1.3,
          }}
        >
          Ready to go live?
        </p>
        <p
          className="wf-sans"
          style={{
            fontSize: 14,
            color: "var(--wf-ink-45)",
            margin: "0 0 28px",
            lineHeight: 1.5,
          }}
        >
          Choose a plan and your secretary starts working on{" "}
          {data.weddingDate ? formatDate(data.weddingDate) : "your wedding day"}.
        </p>

        <Link
          href="/pricing"
          className="wf-btn wf-btn-primary wf-btn-lg"
          style={{
            display: "inline-block",
            padding: "14px 36px",
            fontSize: 14,
            textDecoration: "none",
          }}
        >
          Choose your plan
        </Link>

        <div style={{ marginTop: 16 }}>
          <Link
            href="/pricing"
            className="wf-sans"
            style={{
              fontSize: 13,
              color: "var(--wf-ink-45)",
              textDecoration: "underline",
              textUnderlineOffset: 3,
            }}
          >
            Skip to pricing
          </Link>
        </div>
      </div>
    </main>
  );
}
