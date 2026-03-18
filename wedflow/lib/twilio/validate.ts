// requires: twilio (npm install twilio)
import twilio from "twilio";

export async function validateTwilioWebhook(
  request: Request
): Promise<boolean> {
  try {
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    if (!authToken) return false;

    const signature = request.headers.get("x-twilio-signature");
    if (!signature) return false;

    // On Vercel, request.url is the internal URL. Reconstruct the public URL
    // from x-forwarded-host and x-forwarded-proto so the HMAC matches what
    // Twilio signed against.
    const forwardedHost = request.headers.get("x-forwarded-host");
    const forwardedProto = request.headers.get("x-forwarded-proto");
    const parsedUrl = new URL(request.url);
    const url =
      forwardedHost && forwardedProto
        ? `${forwardedProto}://${forwardedHost}${parsedUrl.pathname}${parsedUrl.search}`
        : request.url;

    const body = await request.clone().text();

    return twilio.validateRequestWithBody(authToken, signature, url, body);
  } catch {
    return false;
  }
}
