import { redirect } from "next/navigation";
import { acceptCircleInvite } from "@/app/circle/actions";

export default async function AcceptPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // This page runs after the magic link callback.
  // The user is now authenticated. Bind their auth to the invite.
  const result = await acceptCircleInvite(token);

  if (result.success) {
    redirect("/portal");
  }

  // If binding fails (email mismatch, expired, already used), show error
  return (
    <div className="wf-sans" style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--wf-cream)",
      padding: 16,
    }}>
      <div style={{
        maxWidth: 440,
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 16,
        padding: 48,
      }}>
        <h1 className="wf-serif" style={{
          fontSize: 28,
          fontWeight: 400,
          color: "var(--wf-forest)",
          margin: 0,
        }}>
          Could not join the circle
        </h1>
        <p style={{
          fontSize: 15,
          lineHeight: 1.6,
          color: "var(--wf-ink-60)",
          margin: 0,
        }}>
          {result.error}
        </p>
      </div>
    </div>
  );
}
