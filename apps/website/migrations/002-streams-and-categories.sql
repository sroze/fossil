CREATE TABLE IF NOT EXISTS "store_streams" (
  store_id UUID NOT NULL,
  stream_name TEXT NOT NULL,
  category TEXT NOT NULL,
  position BIGINT NOT NULL,
  first_written_in_at TIMESTAMP NOT NULL,
  last_written_in_at TIMESTAMP NOT NULL,
  PRIMARY KEY (store_id, stream_name)
);

CREATE TABLE IF NOT EXISTS "store_categories" (
  store_id UUID NOT NULL,
  category TEXT NOT NULL,
  PRIMARY KEY (store_id, category)
);
