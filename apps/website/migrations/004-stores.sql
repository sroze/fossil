CREATE TABLE IF NOT EXISTS "stores" (
  store_id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  last_known_checkpoint BIGINT NOT NULL
);
