"use client";

interface SMSMessage {
  from: "guest" | "vendor" | "wedflow";
  text: string;
  label?: string;
}

interface SMSPreviewProps {
  messages: SMSMessage[];
  /** Light theme (cream bg) or dark theme (forest bg). Default: light. */
  theme?: "light" | "dark";
}

export type { SMSMessage };

export default function SMSPreview({ messages, theme = "light" }: SMSPreviewProps) {
  const isDark = theme === "dark";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {messages.map((msg, j) => (
        <div
          key={j}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: msg.from === "wedflow" ? "flex-end" : "flex-start",
            gap: 4,
          }}
        >
          {/* Sender label */}
          {msg.from !== "wedflow" && (
            <span
              className="wf-sans"
              style={{
                fontSize: 10,
                color: isDark ? "var(--wf-cream-ink-50)" : "var(--wf-ink-45)",
                fontWeight: 500,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                padding: "0 8px",
              }}
            >
              {msg.from === "vendor" ? "Vendor" : "Guest"}
            </span>
          )}

          {/* WedFlow label with held indicator */}
          {msg.from === "wedflow" && msg.label && (
            <span
              className="wf-sans"
              style={{
                fontSize: 10,
                color: "var(--wf-terracotta)",
                fontWeight: 600,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                padding: "0 8px",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "var(--wf-terracotta)",
                }}
              />
              {msg.label}
            </span>
          )}

          {/* WedFlow label without held indicator */}
          {msg.from === "wedflow" && !msg.label && (
            <span
              className="wf-sans"
              style={{
                fontSize: 10,
                color: isDark ? "var(--wf-sage)" : "var(--wf-forest)",
                fontWeight: 500,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                padding: "0 8px",
              }}
            >
              WedFlow
            </span>
          )}

          {/* Bubble */}
          <div
            style={{
              background:
                msg.from === "wedflow"
                  ? isDark
                    ? "rgba(28,59,43,0.9)"
                    : "#2D5016"
                  : isDark
                    ? "rgba(253,251,247,0.18)"
                    : "rgba(28,59,43,0.06)",
              color:
                msg.from === "wedflow"
                  ? "var(--wf-cream)"
                  : isDark
                    ? "#ffffff"
                    : "var(--wf-ink)",
              padding: "10px 14px",
              borderRadius: 14,
              borderTopLeftRadius: msg.from !== "wedflow" ? 4 : 14,
              borderTopRightRadius: msg.from === "wedflow" ? 4 : 14,
              fontSize: 13,
              lineHeight: 1.5,
              maxWidth: "88%",
              fontFamily: "var(--wf-sans)",
            }}
          >
            {msg.text}
          </div>
        </div>
      ))}
    </div>
  );
}
