import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { smsReceived } from "@/lib/inngest/functions/sms-received";
import { churnCheck } from "@/lib/inngest/functions/churn-check";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [smsReceived, churnCheck],
});
