import { inngest } from "@/lib/inngest/client";
import { createServiceRoleClient } from "@/lib/supabase/server";

// requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

// ----------------------------------------------------------------
// Churn check — runs every Monday at 9am UTC
// ----------------------------------------------------------------

type ChurnStatus = "active" | "at_risk" | "churned";

interface CoupleRow {
  id: string;
  last_active_at: string | null;
  churn_status: string;
  usage_streak_weeks: number;
}

export const churnCheck = inngest.createFunction(
  {
    id: "churn-check",
    name: "wedflow/churn.check",
    triggers: [{ cron: "TZ=UTC 0 9 * * 1" }],
  },
  async ({ step }) => {
    // Step 1: Fetch all paying couples
    const couples = await step.run("fetch-couples", async () => {
      const supabase = createServiceRoleClient();

      const { data, error } = await supabase
        .from("couples")
        .select("id, last_active_at, churn_status, usage_streak_weeks")
        .neq("plan", "none");

      if (error) {
        throw new Error(`Failed to fetch couples: ${error.message}`);
      }

      return (data ?? []) as CoupleRow[];
    });

    if (couples.length === 0) {
      return { processed: 0 };
    }

    // Step 2: For each couple, check activity and update churn status
    const results = await step.run("evaluate-churn", async () => {
      const supabase = createServiceRoleClient();
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
      const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);

      let active = 0;
      let atRisk = 0;
      let churned = 0;

      for (const couple of couples) {
        // Check if any inbound messages were received in the past 7 days
        const { count, error: msgError } = await supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("direction", "inbound")
          .gte("created_at", sevenDaysAgo.toISOString())
          .in(
            "conversation_id",
            // Subquery: get conversation IDs for this couple
            (
              await supabase
                .from("conversations")
                .select("id")
                .eq("couple_id", couple.id)
            ).data?.map((c) => c.id as string) ?? []
          );

        if (msgError) {
          // Log but continue — don't let one couple's error block the batch
          console.error(
            `[churn-check] Error checking messages for couple ${couple.id}`
          );
          continue;
        }

        const hasRecentMessages = (count ?? 0) > 0;
        const lastActive = couple.last_active_at
          ? new Date(couple.last_active_at)
          : null;

        // Determine new churn status
        let newStatus: ChurnStatus;

        if (hasRecentMessages || (lastActive && lastActive >= threeDaysAgo)) {
          // Active: messages in past 7 days OR last_active_at within 3 days
          newStatus = "active";
        } else if (
          lastActive &&
          lastActive >= fiveDaysAgo &&
          lastActive < threeDaysAgo
        ) {
          // At risk: last_active_at 3-5 days ago and no messages in 7 days
          newStatus = "at_risk";
        } else {
          // Churned: last_active_at 7+ days ago (or null) and no messages
          newStatus = "churned";
        }

        // Build update payload
        const updates: Record<string, unknown> = {
          churn_status: newStatus,
        };

        // Update usage streak
        if (newStatus === "active") {
          updates.usage_streak_weeks = couple.usage_streak_weeks + 1;
        } else if (newStatus === "churned") {
          updates.usage_streak_weeks = 0;
          // Set churned_at only on transition to churned
          if (couple.churn_status !== "churned") {
            updates.churned_at = now.toISOString();
          }
        }
        // at_risk: streak stays the same (not yet broken)

        // Clear churned_at if coming back to active
        if (
          newStatus === "active" &&
          couple.churn_status === "churned"
        ) {
          updates.churned_at = null;
        }

        await supabase.from("couples").update(updates).eq("id", couple.id);

        if (newStatus === "active") active++;
        else if (newStatus === "at_risk") atRisk++;
        else churned++;
      }

      return { active, atRisk, churned };
    });

    return {
      processed: couples.length,
      ...results,
    };
  }
);
