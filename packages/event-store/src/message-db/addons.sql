-- Add the concept of a prefix
CREATE OR REPLACE FUNCTION prefix(
  stream_name varchar
)
RETURNS varchar
AS $$
BEGIN
  RETURN SPLIT_PART(prefix.stream_name, '#', 1);
END;
$$ LANGUAGE plpgsql
IMMUTABLE;

DROP INDEX IF EXISTS messages_prefix;
CREATE INDEX messages_prefix ON messages (
  prefix(stream_name),
  global_position
);
