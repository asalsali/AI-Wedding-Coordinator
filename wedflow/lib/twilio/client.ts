// requires: twilio (npm install twilio)
import twilio from "twilio";

type TwilioClient = ReturnType<typeof twilio>;

let _client: TwilioClient | null = null;

export function getTwilioClient(): TwilioClient {
  if (_client) return _client;

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    throw new Error(
      "Missing required env vars: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN"
    );
  }

  _client = twilio(accountSid, authToken);
  return _client;
}
