import { createServiceRoleClient } from "@/lib/supabase/server";
import { AuditEventType } from "@/types";

// requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

/**
 * Write an audit log entry. This function never throws — audit failures
 * must not break the pipeline. Errors are logged to console only.
 *
 * SECURITY: Never pass message body content in metadata. Only IDs,
 * classification results, confidence scores, and Twilio SIDs.
 */
export async function writeAuditLog(params: {
  coupleId: string | null;
  eventType: AuditEventType;
  resourceType: string;
  resourceId: string | null;
  metadata?: Record<string, unknown>;
  errorMessage?: string;
}): Promise<void> {
  try {
    const supabase = createServiceRoleClient();

    const { error } = await supabase.from("audit_logs").insert({
      couple_id: params.coupleId,
      event_type: params.eventType,
      resource_type: params.resourceType,
      resource_id: params.resourceId,
      metadata: params.metadata ?? null,
      error_message: params.errorMessage ?? null,
    });

    if (error) {
      console.error("audit/service: failed to write audit log", {
        eventType: params.eventType,
        resourceId: params.resourceId,
        dbError: error.message,
      });
    }
  } catch (err) {
    console.error("audit/service: unexpected error writing audit log", {
      eventType: params.eventType,
      resourceId: params.resourceId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
