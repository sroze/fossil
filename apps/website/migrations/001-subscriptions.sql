CREATE TABLE IF NOT EXISTS "subscriptions" (
  subscription_id UUID PRIMARY KEY,
  store_id UUID,
  name TEXT,
  category TEXT,
  target TEXT,
  deleted BOOLEAN DEFAULT FALSE
);
