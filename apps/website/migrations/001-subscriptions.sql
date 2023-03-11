CREATE TABLE IF NOT EXISTS "subscriptions" (
  subscription_id UUID PRIMARY KEY,
  store_id UUID NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL
);
