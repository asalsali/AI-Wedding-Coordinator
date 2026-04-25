"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { updateTaskStatus } from "@/app/circle/actions";
import type { CircleMember, TaskAssignment, CircleRole } from "@/types";

const ROLE_LABELS: Record<CircleRole, string> = {
  moh: "Maid of Honor",
  best_man: "Best Man",
  family_lead: "Family",
  bridesmaid: "Bridesmaid",
  groomsman: "Groomsman",
};

interface ConversationSummary {
  id: string;
  guestName: string | null;
  lastMessageAt: string;
  lastMessageBody: string;
  messageCount: number;
}

export default function PortalClient({
  member,
  coupleName,
  initialTasks,
  initialConversations,
}: {
  member: CircleMember;
  coupleName: string;
  initialTasks: TaskAssignment[];
  initialConversations: ConversationSummary[];
}) {
  const [tasks, setTasks] = useState(initialTasks);
  const [updatingTask, setUpdatingTask] = useState<string | null>(null);
  const [showHomeScreenBanner, setShowHomeScreenBanner] = useState(false);
  const router = useRouter();

  // Show "Add to Home Screen" prompt on mobile if not already installed as PWA
  useEffect(() => {
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches
      || ('standalone' in window.navigator && (window.navigator as unknown as { standalone: boolean }).standalone);
    const dismissed = localStorage.getItem("wf-homescreen-dismissed");
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile && !isStandalone && !dismissed) {
      setShowHomeScreenBanner(true);
    }
  }, []);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const pendingTasks = tasks.filter(t => t.status === "pending" || t.status === "in_progress");
  const doneTasks = tasks.filter(t => t.status === "done" || t.status === "dismissed");

  async function handleMarkDone(taskId: string) {
    setUpdatingTask(taskId);
    const result = await updateTaskStatus(taskId, "done");
    if (result.success) {
      setTasks(prev =>
        prev.map(t =>
          t.id === taskId
            ? { ...t, status: "done" as const, completed_at: new Date().toISOString() }
            : t
        )
      );
    }
    setUpdatingTask(null);
  }

  async function handleDismiss(taskId: string) {
    setUpdatingTask(taskId);
    const result = await updateTaskStatus(taskId, "dismissed");
    if (result.success) {
      setTasks(prev =>
        prev.map(t =>
          t.id === taskId
            ? { ...t, status: "dismissed" as const, completed_at: new Date().toISOString() }
            : t
        )
      );
    }
    setUpdatingTask(null);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
  }

  function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  return (
    <div className="wf-sans" style={{ minHeight: "100vh", background: "var(--wf-cream)" }}>
      {/* Header */}
      <header style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 16px",
        borderBottom: "1px solid var(--wf-line)",
        background: "var(--wf-paper)",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}>
        <Image src="/WedFlowlogo.png" alt="WedFlow" width={28} height={28} />
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--wf-forest)" }}>
            {coupleName}
          </div>
          <span className="wf-badge wf-badge-success" style={{ fontSize: 10 }}>
            {ROLE_LABELS[member.role]}
          </span>
        </div>
        <button
          onClick={handleSignOut}
          className="wf-btn wf-btn-ghost wf-btn-sm"
        >
          Sign out
        </button>
      </header>

      {/* Add to Home Screen banner */}
      {showHomeScreenBanner && (
        <div style={{ background: "var(--wf-forest)", color: "var(--wf-cream)", padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>Add WedFlow to your home screen</div>
            <div style={{ fontSize: 11, opacity: 0.7 }}>
              {/iPhone|iPad/i.test(typeof navigator !== 'undefined' ? navigator.userAgent : '')
                ? 'Tap the share button, then "Add to Home Screen"'
                : 'Tap the menu button, then "Add to Home Screen"'}
            </div>
          </div>
          <button onClick={() => { setShowHomeScreenBanner(false); localStorage.setItem("wf-homescreen-dismissed", "1"); }} style={{ background: "none", border: "none", color: "var(--wf-cream)", cursor: "pointer", padding: 4, fontSize: 18, lineHeight: 1, opacity: 0.7 }}>
            ×
          </button>
        </div>
      )}

      {/* Content */}
      <main style={{ maxWidth: 640, margin: "0 auto", padding: 16 }}>

        {/* Task Counter */}
        {pendingTasks.length > 0 && (
          <div style={{
            padding: "14px 16px",
            background: "rgba(196,113,74,0.06)",
            borderRadius: 10,
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}>
            <span style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "var(--wf-terracotta)",
              color: "var(--wf-cream)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              fontWeight: 600,
              flexShrink: 0,
            }}>
              {pendingTasks.length}
            </span>
            <span style={{ fontSize: 14, color: "var(--wf-ink)" }}>
              {pendingTasks.length === 1 ? "thing needs" : "things need"} your attention
            </span>
          </div>
        )}

        {/* Empty state */}
        {tasks.length === 0 && initialConversations.length === 0 && (
          <div style={{
            textAlign: "center",
            padding: "48px 24px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
          }}>
            <Image src="/WedFlowlogo.png" alt="WedFlow" width={40} height={40} />
            <h2 className="wf-serif" style={{
              fontSize: 20,
              fontWeight: 400,
              color: "var(--wf-forest)",
              margin: 0,
            }}>
              Welcome to {coupleName}'s circle
            </h2>
            <p style={{
              fontSize: 14,
              lineHeight: 1.6,
              color: "var(--wf-ink-60)",
              margin: 0,
              maxWidth: 320,
            }}>
              As their {ROLE_LABELS[member.role].toLowerCase()}, you'll see tasks and updates here.
              {coupleName} are still getting set up, so sit tight.
            </p>
          </div>
        )}

        {/* Pending Tasks */}
        {pendingTasks.length > 0 && (
          <section aria-label="Tasks">
            <h2 className="wf-serif" style={{
              fontSize: 18,
              fontWeight: 400,
              color: "var(--wf-forest)",
              margin: "0 0 12px",
            }}>
              Your tasks
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {pendingTasks.map(task => (
                <div
                  key={task.id}
                  style={{
                    padding: 16,
                    border: "1px solid var(--wf-line)",
                    borderLeft: "3px solid var(--wf-terracotta)",
                    borderRadius: 10,
                    background: "var(--wf-paper)",
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--wf-ink)", marginBottom: 4 }}>
                    {task.title}
                  </div>
                  {task.description && (
                    <div style={{ fontSize: 13, color: "var(--wf-ink-60)", lineHeight: 1.4, marginBottom: 8 }}>
                      {task.description}
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: "var(--wf-ink-45)", marginBottom: 10 }}>
                    From {coupleName} · {timeAgo(task.created_at)}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      className="wf-btn wf-btn-primary wf-btn-sm"
                      onClick={() => handleMarkDone(task.id)}
                      disabled={updatingTask === task.id}
                      style={{ minHeight: 44, minWidth: 44 }}
                    >
                      {updatingTask === task.id ? "..." : "Mark done"}
                    </button>
                    <button
                      className="wf-btn wf-btn-ghost wf-btn-sm"
                      onClick={() => handleDismiss(task.id)}
                      disabled={updatingTask === task.id}
                      style={{ minHeight: 44 }}
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Done Tasks */}
        {doneTasks.length > 0 && (
          <section style={{ marginTop: 24 }}>
            <h3 style={{
              fontSize: 12,
              fontWeight: 500,
              color: "var(--wf-ink-45)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              margin: "0 0 8px",
            }}>
              Done
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {doneTasks.map(task => (
                <div
                  key={task.id}
                  style={{
                    padding: "10px 16px",
                    border: "1px solid var(--wf-cream-border)",
                    borderRadius: 10,
                    background: "var(--wf-cream-warm)",
                    opacity: 0.7,
                  }}
                >
                  <div style={{
                    fontSize: 13,
                    color: "var(--wf-ink-25)",
                    textDecoration: task.status === "done" ? "line-through" : "none",
                  }}>
                    {task.status === "done" ? "\u2713 " : ""}{task.title}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Conversations */}
        {initialConversations.length > 0 && (
          <section aria-label="Conversations" style={{ marginTop: 32 }}>
            <h2 className="wf-serif" style={{
              fontSize: 18,
              fontWeight: 400,
              color: "var(--wf-forest)",
              margin: "0 0 12px",
            }}>
              Conversations in your circle
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {initialConversations.map(conv => (
                <div
                  key={conv.id}
                  style={{
                    padding: 14,
                    border: "1px solid var(--wf-line)",
                    borderLeft: "3px solid var(--wf-sage)",
                    borderRadius: 10,
                    background: "var(--wf-paper)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--wf-ink)" }}>
                      {conv.guestName ?? "Guest"}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--wf-ink-45)" }}>
                      {timeAgo(conv.lastMessageAt)}
                    </span>
                  </div>
                  <div style={{
                    fontSize: 13,
                    color: "var(--wf-ink-60)",
                    lineHeight: 1.4,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                  }}>
                    {conv.lastMessageBody}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--wf-ink-25)", marginTop: 4 }}>
                    {conv.messageCount} {conv.messageCount === 1 ? "message" : "messages"}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
