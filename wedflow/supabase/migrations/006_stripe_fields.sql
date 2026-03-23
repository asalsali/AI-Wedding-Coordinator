ALTER TABLE couples ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE couples ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE couples ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'none';
ALTER TABLE couples ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'none';
