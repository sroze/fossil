CREATE TABLE IF NOT EXISTS "stores" (
  store_id UUID PRIMARY KEY,
  org_id UUID NOT NULL,
  name TEXT NOT NULL,
  last_known_checkpoint BIGINT NOT NULL
);
