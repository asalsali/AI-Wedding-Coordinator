# WedFlow Design System

## Brand Soul

WedFlow is the shepherd's tool. The couple tends their flock. The inner circle (MOH, best man, family leads) are trusted helpers. The guests are the flock, cared for through text.

The brand draws from John 10. The sheep logo at center is not decorative. It carries the meaning of tending, caring, and holding.

**Voice:** Natural, warm, direct. Words like "tend," "care," "hold," "entrust." Never clinical, never corporate. No emojis. No em dashes. Say what it does plainly, and let the warmth come from the values.

## Color System

All colors are CSS custom properties defined in `app/globals.css`.

### Core Brand
| Token | Hex | Usage |
|---|---|---|
| `--wf-forest` | #1C3B2B | Primary brand. Sidebar, headers, outbound message bubbles. |
| `--wf-forest-deep` | #14301F | Hover states on forest backgrounds. |
| `--wf-forest-soft` | #2A4D3A | Subtle forest tints. |
| `--wf-cream` | #FDFBF7 | Page background, button text on forest/terracotta. |
| `--wf-cream-warm` | #F7F1E8 | Card backgrounds, subtle warmth. |
| `--wf-terracotta` | #C4714A | CTA buttons (with white/cream text only). Accent color. |
| `--wf-terracotta-deep` | #A85C38 | Hover on terracotta buttons. **Use for text on cream backgrounds** (passes WCAG AA at ~4.8:1). |
| `--wf-terracotta-soft` | #E8B39A | Light terracotta backgrounds (badges, highlights). |
| `--wf-ink` | #1A1A1A | Body text on light backgrounds. |

### Accessibility Contrast Rules
- **Text on cream:** Use `--wf-ink` for body, `--wf-terracotta-deep` for accent text. Never `--wf-terracotta` for body text (fails WCAG AA at 3.6:1).
- **Text on forest:** Use `--wf-cream` or `--wf-cream-ink` (0.72 opacity).
- **Buttons:** White/cream text on `--wf-terracotta` is fine (4.6:1 passes). White text on `--wf-forest` is fine (12:1+).
- **Minimum touch target:** 44px on all interactive elements.

### Functional Colors
| Token | Hex | Usage |
|---|---|---|
| `--wf-sage` | #7B9174 | Inner circle indicators, MOH badges, success states. |
| `--wf-blush` | #E8B39A | Soft highlights, terracotta tint areas. |
| `--wf-sand` | #EFE6D4 | Warm neutral backgrounds. |
| `--wf-rose` | #B4544E | Sensitive message badges, warning states. |

### Opacity Tokens
| Token | Usage |
|---|---|
| `--wf-ink-60` | Secondary text on light backgrounds. |
| `--wf-ink-45` | Tertiary text, eyebrow labels, timestamps. |
| `--wf-ink-25` | Disabled text, placeholder text. |
| `--wf-cream-ink` | Primary text on dark (forest) backgrounds. |
| `--wf-cream-ink-50` | Secondary text on dark backgrounds. |

## Typography

### Font Stacks
| Token | Fonts | Usage |
|---|---|---|
| `--wf-serif` | Newsreader, Cormorant Garamond, Georgia, serif | Headlines, hero text, section titles. Editorial voice. |
| `--wf-sans` | Plus Jakarta Sans, system-ui, Helvetica Neue, Arial, sans-serif | Body text, UI labels, buttons, badges. |

### Scale
| Element | Font | Size | Weight | Line Height |
|---|---|---|---|---|
| Hero headline | serif | 40px | 400 (regular) | 1.15 |
| Section heading | serif | 20px | 400 | 1.3 |
| Body text | sans | 16px | 400 | 1.6 |
| UI label / nav | sans | 13px | 500 | 1 |
| Button text | sans | 14px | 500 | 1 |
| Badge text | sans | 11px | 500 | 1 |
| Eyebrow | sans | 11px | 500 | 1 (uppercase, 0.22em spacing) |
| Timestamp | sans | 11px | 400 | 1 |
| Small caption | sans | 10px | 400 | 1.3 |

### Italic Usage
Hero headlines use italic for emphasis on the emotional word. "Your wedding takes *a village.*" The italic carries the feeling, not decoration.

## Spacing

Base unit: 4px.

| Token | Value | Usage |
|---|---|---|
| xs | 4px | Tight gaps (badge internal padding, inline spacing) |
| sm | 8px | Related element spacing (badge gap, button icon gap) |
| md | 12px | Component internal padding (sidebar items, nav gaps) |
| lg | 16px | Section padding, card padding |
| xl | 20px | Hero body margin, section gaps |
| 2xl | 32px | Section container padding |
| 3xl | 40px | Hero padding, major section breaks |
| 4xl | 48px | Screen-level separators |

## Shadows

| Token | Value | Usage |
|---|---|---|
| `--wf-shadow-sm` | 0 1px 2px rgba(28,59,43,0.06) | Subtle card elevation. |
| `--wf-shadow-md` | 0 4px 14px rgba(28,59,43,0.08) | Hover states, floating elements. |
| `--wf-shadow-lg` | 0 12px 32px rgba(28,59,43,0.12) | Modals, overlays. |
| `--wf-shadow-xl` | 0 24px 60px rgba(28,59,43,0.14) | Hero phone mockup, feature cards. |

Shadows use forest-green tinted rgba, not black. This keeps shadows warm.

## Border Radius

| Element | Radius |
|---|---|
| Buttons | 999px (pill shape) |
| Cards | 10-12px |
| Badges | 999px (pill shape) |
| Message bubbles | 12px (with 4px on the tail corner) |
| Sidebar items | 10px |
| Input fields | 8px |
| Avatars | 50% |

## Components

### Buttons (`.wf-btn`)
Four variants: primary (terracotta), forest, ghost (outlined), light (white).
Two sizes: default (12px 22px padding), small (8px 14px), large (14px 28px).
Hover: translateY(-1px) + shadow on primary. Color darken on others.

### Badges (`.wf-badge`)
Six variants: neutral, terracotta, sensitive, success, warning, dark.
All pill-shaped, 11px text, 500 weight. Use for message classification, status indicators, role labels.

**Circle of Care badges:**
| Badge | Variant | Usage |
|---|---|---|
| "Needs you" | `wf-badge-terracotta` | Escalated message awaiting couple review |
| "Sensitive" | `wf-badge-sensitive` | Message classified as sensitive |
| "Maid of Honor" | `wf-badge-success` | Inner circle role label |
| "Family" | custom (blush bg, terracotta-deep text) | Family lead role label |
| "Auto-replied" / "Answered in your voice" | `wf-badge-neutral` | Routine message handled |
| "Entrusted to you" | `wf-badge-success` | Task assigned to circle member |
| "Held for the couple" | `wf-badge-terracotta` | Escalated, pending couple review |

### Eyebrow (`.wf-eyebrow`)
Uppercase, 11px, 0.22em spacing, ink-45 color. Terracotta line before text (28px). Use for section labels.

### Sidebar Nav (`.wf-sidebar-item`)
Forest background sidebar. Cream text. Active state: cream background, forest text. 10px radius.

### Message Bubbles
- **Inbound (guest):** Light background (rgba forest 0.05), 12px radius, 4px bottom-left.
- **Outbound (AI reply, sent):** Forest background, cream text, 12px radius, 4px bottom-right.
- **Draft (suggested reply):** Dashed 1px terracotta border, terracotta-tinted background. "Suggested Reply" label above.

### Task Cards (new, for portal)
- Container: 1px solid `--wf-line`, 10px radius, 16px padding.
- Layout: title (sans 14px 600) + person (sans 12px, ink-60) + deadline (sans 11px, terracotta-deep if soon) + linked message preview (sans 12px, ink-45, max 2 lines).
- Actions: "Mark done" button (wf-btn-sm wf-btn-ghost), minimum 44px touch target.
- Done state: background fades to cream-warm, text to ink-25, checkmark icon in sage.
- Active/pending: left border 3px sage (inner circle) or terracotta (from couple).

### Empty States
- Container: centered, max-width 400px, padding 48px.
- WedFlow logo at top (40px height).
- Heading: serif, 20px, forest.
- Body: sans, 14px, ink-60, line-height 1.6.
- Primary action: wf-btn-primary below body text.
- Tone: warm, role-aware. "Welcome to [couple]'s circle. As [role], you'll see [what] here."

### Invite Email Template
- From: "[Couple name] via WedFlow"
- Subject: "[Couple name] has invited you into their circle"
- Body: couple-first. "[Name1] and [Name2] have invited you into their wedding circle as their [role]. You'll be the first to know when they need your help."
- CTA button: terracotta, "Join their circle"
- Footer: "Sent by WedFlow on behalf of [couple name]"

## Layout Patterns

### Dashboard (couple)
- Sidebar (240px, forest background) + main content area (cream background).
- Sidebar: logo, user info, nav items (Home, Inbox, Guests, Wedding Profile, Settings, Circle), sign out.
- Main: varies by view. Full-width content with 24-32px padding.

### Portal (circle member)
- No sidebar. Single column, mobile-first.
- Header: WedFlow logo (left), couple name + role badge (center), sign out (right). Cream background, forest bottom border.
- Content: task counter at top ("3 things need you"), task cards below, conversations section below tasks.
- Max-width: 640px centered on desktop. Full-width on mobile with 16px padding.

### Landing Page
- Full-width sections. No max-width constraint on backgrounds.
- Content within sections: max-width 1100px, centered, 40px padding.
- Nav: sticky, cream background, forest text. Logo left, links center, CTA right.

## Animation

Three entrance animations defined in globals.css:
- `fadeInUp`: 0.6s ease-out. For hero content, section reveals.
- `fadeIn`: 0.5s ease-out. For subtle appearances.
- `scaleIn`: 0.4s ease-out. For modals, overlays.

Staggered delays: 0s, 0.18s, 0.36s for sequential content loads.

**Task completion:** fade to muted state over 0.3s, stay visible 5 seconds, then slide down to Done section.

## Responsive Breakpoints

| Breakpoint | Width | Notes |
|---|---|---|
| Mobile | < 640px | Single column. Stack all multi-column layouts. 16px padding. |
| Tablet | 640-1024px | Two columns where it fits. 24px padding. |
| Desktop | > 1024px | Full layout. Sidebar visible. 32px padding. |

### Portal (mobile-first)
- Always single column regardless of viewport.
- Task cards: full width, 16px side padding.
- Touch targets: 44px minimum on all buttons.
- Header: logo shrinks, couple name truncates with ellipsis.

### Landing Page (mobile)
- 3-column "How" section: stacks to single column.
- Hero: text above, circle diagram below (stacked).
- Nav: hamburger menu on mobile.

## ARIA and Keyboard

- Portal task list: `role="list"`, each task `role="listitem"`.
- Task actions: focusable via Tab, activated via Enter/Space.
- Portal sections: `aria-label="Tasks"`, `aria-label="Conversations"`.
- Badge role: `role="status"` for dynamic badges (task count).
- Skip link: "Skip to main content" on all pages.
- Focus ring: 2px solid terracotta, 2px offset. Visible on keyboard focus only (`:focus-visible`).
