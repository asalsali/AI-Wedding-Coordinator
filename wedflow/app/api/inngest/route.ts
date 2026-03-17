import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { smsReceived } from "@/lib/inngest/functions/sms-received";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [smsReceived],
});
