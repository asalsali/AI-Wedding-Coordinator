import { createServiceRoleClient } from '@/lib/supabase/server';

// requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

export interface PushSubscriptionRecord {
  id: string;
  couple_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: string;
}

export async function saveSubscription(
  coupleId: string,
  subscription: { endpoint: string; p256dh: string; auth: string }
): Promise<void> {
  const supabase = createServiceRoleClient();

  const { error } = await supabase
    .from('push_subscriptions')
    .upsert(
      {
        couple_id: coupleId,
        endpoint: subscription.endpoint,
        p256dh: subscription.p256dh,
        auth: subscription.auth,
      },
      { onConflict: 'endpoint' }
    );

  if (error) {
    throw new Error(`Failed to save push subscription: ${error.message}`);
  }
}

export async function getSubscriptionsForCouple(
  coupleId: string
): Promise<PushSubscriptionRecord[]> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from('push_subscriptions')
    .select('id, couple_id, endpoint, p256dh, auth, created_at')
    .eq('couple_id', coupleId);

  if (error) {
    throw new Error(`Failed to fetch push subscriptions: ${error.message}`);
  }

  return data ?? [];
}

export async function deleteSubscription(endpoint: string): Promise<void> {
  const supabase = createServiceRoleClient();

  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', endpoint);

  if (error) {
    throw new Error(`Failed to delete push subscription: ${error.message}`);
  }
}
