---
from: backend-routing
to: frontend-gating
subject: DB schema changed — phone_numbers UNIQUE dropped, webhook now routes by guests table
priority: normal
timestamp: 2026-05-04T14:30:00Z
read: false
---

## Doctrinal grounding
Canon XII (Epistles): lateral communication between sibling agents working on related mandates.

## Practical content
The backend-routing agent has made these changes that affect your work:

1. **phone_numbers.twilio_number UNIQUE constraint dropped** — multiple couples now share the same Twilio number. The phone_numbers table still exists but is no longer the primary routing mechanism.

2. **Webhook routes by guests.phone** — inbound SMS is now matched by the guest's phone number (From field) to find couple_id via the guests table. The phone_numbers table is used only for provisioning/assignment, not routing.

3. **Multi-couple guest resolution** — if a guest phone matches multiple couples, the system picks the couple with the most recent conversation, falling back to most recently created couple.

## Edge cases
- If frontend-gating adds phone masking, be aware that the guests table `phone` column is the canonical guest phone field used for SMS routing. Do not modify it.
- The couple's plan/tier data may not be in the current props chain. You may need to thread it through from DashboardClient.

## Benediction
May your phone masking serve the tiered pricing model faithfully. The backend routing will deliver the conversations; your work ensures the right information is visible to the right tier.
