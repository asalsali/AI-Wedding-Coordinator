"use client";

import { useState } from "react";
import Image from "next/image";
import { createBrowserClient } from "@supabase/ssr";
import { acceptCircleInvite } from "@/app/circle/actions";
import type { CircleRole } from "@/types";

const ROLE_LABELS: Record<CircleRole, string> = {
  moh: "Maid of Honor",
  best_man: "Best Man",
  family_lead: "Family",
  bridesmaid: "Bridesmaid",
  groomsman: "Groomsman",
};

interface InviteData {
  valid: boolean;
  expired?: boolean;
  member?: {
    name: string;
    email: string;
    role: CircleRole;
    coupleName: string;
  };
}

export default function JoinClient({
  token,
  invite,
}: {
  token: string;
  invite: InviteData;
}) {
  const [step, setStep] = useState<"view" | "sent" | "accepting" | "done" | "error">("view");
  const [errorMsg, setErrorMsg] = useState("");
  const [copied, setCopied] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Expired invite
  if (invite.expired) {
    return (
      <div className="wf-sans" style={styles.container}>
        <div style={styles.card}>
          <Image src="/WedFlowlogo.png" alt="WedFlow" width={48} height={48} />
          <h1 className="wf-serif" style={styles.heading}>
            This invite has expired
          </h1>
          <p style={styles.body}>
            Ask the couple to send you a new invite from their WedFlow dashboard.
          </p>
        </div>
      </div>
    );
  }

  // Invalid or already used
  if (!invite.valid || !invite.member) {
    return (
      <div className="wf-sans" style={styles.container}>
        <div style={styles.card}>
          <Image src="/WedFlowlogo.png" alt="WedFlow" width={48} height={48} />
          <h1 className="wf-serif" style={styles.heading}>
            Invite not found
          </h1>
          <p style={styles.body}>
            This invite link may have already been used or is no longer valid.
          </p>
        </div>
      </div>
    );
  }

  const { name, email, role, coupleName } = invite.member;

  async function handleJoin() {
    setStep("sent");
    setErrorMsg("");

    // Send magic link to the invited email
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/join/${token}/accept`,
      },
    });

    if (error) {
      setErrorMsg("Could not send the sign-in link. Try copying the invite link instead.");
      setStep("error");
    }
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const input = document.createElement("input");
      input.value = window.location.href;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  // Magic link sent
  if (step === "sent") {
    return (
      <div className="wf-sans" style={styles.container}>
        <div style={styles.card}>
          <Image src="/WedFlowlogo.png" alt="WedFlow" width={48} height={48} />
          <h1 className="wf-serif" style={styles.heading}>
            Check your email
          </h1>
          <p style={styles.body}>
            We sent a sign-in link to <strong>{email}</strong>. Click it to join {coupleName}'s circle.
          </p>
          <p style={{ ...styles.body, fontSize: 13, color: "var(--wf-ink-45)" }}>
            If you don't see it, check your spam folder.
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (step === "error") {
    return (
      <div className="wf-sans" style={styles.container}>
        <div style={styles.card}>
          <Image src="/WedFlowlogo.png" alt="WedFlow" width={48} height={48} />
          <h1 className="wf-serif" style={styles.heading}>
            Something went wrong
          </h1>
          <p style={styles.body}>{errorMsg}</p>
          <button className="wf-btn wf-btn-primary" onClick={handleJoin}>
            Try again
          </button>
          <button
            className="wf-btn wf-btn-ghost"
            onClick={handleCopyLink}
            style={{ marginTop: 8 }}
          >
            {copied ? "Copied!" : "Copy invite link"}
          </button>
        </div>
      </div>
    );
  }

  // Main invite view
  return (
    <div className="wf-sans" style={styles.container}>
      <div style={styles.card}>
        <Image src="/WedFlowlogo.png" alt="WedFlow" width={48} height={48} />

        <h1 className="wf-serif" style={styles.heading}>
          {coupleName} invited you into their circle
        </h1>

        <div style={styles.roleChip}>
          <span className="wf-badge wf-badge-success">
            {ROLE_LABELS[role]}
          </span>
        </div>

        <p style={styles.body}>
          Welcome, {name}. As their {ROLE_LABELS[role].toLowerCase()}, you'll see tasks and updates from {coupleName} on your own portal. They'll share what they need, and you'll know exactly how to help.
        </p>

        <p style={{ ...styles.body, fontSize: 13, color: "var(--wf-ink-45)" }}>
          A sign-in link will be sent to <strong>{email}</strong>.
        </p>

        <button className="wf-btn wf-btn-primary wf-btn-lg" onClick={handleJoin}>
          Join their circle
        </button>

        <button
          className="wf-btn wf-btn-ghost"
          onClick={handleCopyLink}
          style={{ marginTop: 8 }}
        >
          {copied ? "Copied!" : "Copy invite link"}
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "var(--wf-cream)",
    padding: 16,
  },
  card: {
    maxWidth: 440,
    width: "100%",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 16,
    padding: 48,
  },
  heading: {
    fontSize: 28,
    fontWeight: 400,
    color: "var(--wf-forest)",
    lineHeight: 1.2,
    margin: 0,
  },
  body: {
    fontSize: 15,
    lineHeight: 1.6,
    color: "var(--wf-ink-60)",
    margin: 0,
    maxWidth: 360,
  },
  roleChip: {
    display: "flex",
    justifyContent: "center",
  },
};
