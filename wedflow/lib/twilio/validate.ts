// requires: twilio (npm install twilio)
import twilio from "twilio";

export async function validateTwilioWebhook(
  request: Request
): Promise<boolean> {
  if (process.env.NODE_ENV === 'development') {
    return true;
  }
  
  try {
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    if (!authToken) return false;

    const signature = request.headers.get("x-twilio-signature");
    if (!signature) return false;

    const url = request.url;
    const body = await request.clone().text();

    return twilio.validateRequestWithBody(authToken, signature, url, body);
  } catch {
    return false;
  }
}
