import webpush from 'web-push';
import { getSubscriptionsForCouple, deleteSubscription } from './store';

// requires: NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT

interface PushPayload {
  title: string;
  body: string;
  data?: { url?: string };
}

function getVapidConfig() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;

  if (!publicKey || !privateKey || !subject) {
    throw new Error('VAPID keys not configured');
  }

  return { publicKey, privateKey, subject };
}

export async function sendPushToCouple(
  coupleId: string,
  payload: PushPayload
): Promise<{ sent: number; failed: number }> {
  const vapid = getVapidConfig();

  webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);

  const subscriptions = await getSubscriptionsForCouple(coupleId);
  let sent = 0;
  let failed = 0;

  const payloadString = JSON.stringify(payload);

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        payloadString
      );
      sent++;
    } catch (err: unknown) {
      failed++;
      // If subscription is expired/invalid (410 Gone or 404), remove it
      if (
        err instanceof webpush.WebPushError &&
        (err.statusCode === 410 || err.statusCode === 404)
      ) {
        await deleteSubscription(sub.endpoint).catch(() => {
          // Best-effort cleanup — don't fail the whole send
        });
      }
    }
  }

  return { sent, failed };
}
