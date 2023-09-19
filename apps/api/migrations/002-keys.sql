CREATE TABLE "keys" (
  store_id UUID NOT NULL,
  key_id TEXT NOT NULL,
  key_name TEXT NOT NULL,
  public_key_kid TEXT NOT NULL,
  public_key JSONB NOT NULL,
  private_key JSONB,
  PRIMARY KEY (store_id, key_id)
);

CREATE UNIQUE INDEX idx_public_keys_by_kid ON keys(store_id, public_key_kid);
