-- Inspired from MessageDB 1.3.0
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- `message` type
DO $$ BEGIN
    CREATE TYPE message AS (
      id varchar,
      stream_name varchar,
      type varchar,
      position bigint,
      global_position bigint,
      data varchar,
      metadata varchar,
      time timestamp
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Tables
CREATE TABLE IF NOT EXISTS messages (
  global_position BIGSERIAL PRIMARY KEY,
  position bigint NOT NULL,
  time TIMESTAMP WITHOUT TIME ZONE DEFAULT (now() AT TIME ZONE 'utc') NOT NULL,
  stream_name text NOT NULL,
  type text NOT NULL,
  data jsonb,
  metadata jsonb,
  id UUID NOT NULL DEFAULT gen_random_uuid()
);

-- Core functions
CREATE OR REPLACE FUNCTION category(
  stream_name varchar
)
RETURNS varchar
AS $$
BEGIN
  RETURN SPLIT_PART(category.stream_name, '-', 1);
END;
$$ LANGUAGE plpgsql
IMMUTABLE;

-- Indexes
CREATE INDEX IF NOT EXISTS messages_category ON messages (
  category(stream_name),
  global_position,
  category(metadata->>'correlationStreamName')
);

CREATE UNIQUE INDEX IF NOT EXISTS messages_id ON messages (
  id
);

CREATE UNIQUE INDEX IF NOT EXISTS messages_stream ON messages (
  stream_name,
  position
);


-- Functions
CREATE OR REPLACE FUNCTION acquire_lock(
  stream_name varchar
)
RETURNS bigint
AS $$
DECLARE
  _category varchar;
  _category_name_hash bigint;
BEGIN
  _category := category(acquire_lock.stream_name);
  _category_name_hash := hash_64(_category);
  PERFORM pg_advisory_xact_lock(_category_name_hash);

  IF current_setting('message_store.debug_write', true) = 'on' OR current_setting('message_store.debug', true) = 'on' THEN
    RAISE NOTICE '» acquire_lock';
    RAISE NOTICE 'stream_name: %', acquire_lock.stream_name;
    RAISE NOTICE '_category: %', _category;
    RAISE NOTICE '_category_name_hash: %', _category_name_hash;
  END IF;

  RETURN _category_name_hash;
END;
$$ LANGUAGE plpgsql
VOLATILE;

CREATE OR REPLACE FUNCTION cardinal_id(
  stream_name varchar
)
RETURNS varchar
AS $$
DECLARE
  _id varchar;
BEGIN
  _id := id(cardinal_id.stream_name);

  IF _id IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN SPLIT_PART(_id, '+', 1);
END;
$$ LANGUAGE plpgsql
IMMUTABLE;

CREATE OR REPLACE FUNCTION get_category_messages(
  category varchar,
  "position" bigint DEFAULT 1,
  batch_size bigint DEFAULT 1000,
  correlation varchar DEFAULT NULL,
  consumer_group_member bigint DEFAULT NULL,
  consumer_group_size bigint DEFAULT NULL,
  condition varchar DEFAULT NULL
)
RETURNS SETOF message
AS $$
DECLARE
  _command text;
BEGIN
  IF NOT is_category(get_category_messages.category) THEN
    RAISE EXCEPTION
      'Must be a category: %',
      get_category_messages.category;
  END IF;

  position := COALESCE(position, 1);
  batch_size := COALESCE(batch_size, 1000);

  _command := '
    SELECT
      id::varchar,
      stream_name::varchar,
      type::varchar,
      position::bigint,
      global_position::bigint,
      data::varchar,
      metadata::varchar,
      time::timestamp
    FROM
      messages
    WHERE
      category(stream_name) = $1 AND
      global_position >= $2';

  IF get_category_messages.correlation IS NOT NULL THEN
    IF position('-' IN get_category_messages.correlation) > 0 THEN
      RAISE EXCEPTION
        'Correlation must be a category (Correlation: %)',
        get_category_messages.correlation;
    END IF;

    _command := _command || ' AND
      category(metadata->>''correlationStreamName'') = $4';
  END IF;

  IF (get_category_messages.consumer_group_member IS NOT NULL AND
      get_category_messages.consumer_group_size IS NULL) OR
      (get_category_messages.consumer_group_member IS NULL AND
      get_category_messages.consumer_group_size IS NOT NULL) THEN

    RAISE EXCEPTION
      'Consumer group member and size must be specified (Consumer Group Member: %, Consumer Group Size: %)',
      get_category_messages.consumer_group_member,
      get_category_messages.consumer_group_size;
  END IF;

  IF get_category_messages.consumer_group_member IS NOT NULL AND
      get_category_messages.consumer_group_size IS NOT NULL THEN

    IF get_category_messages.consumer_group_size < 1 THEN
      RAISE EXCEPTION
        'Consumer group size must not be less than 1 (Consumer Group Member: %, Consumer Group Size: %)',
        get_category_messages.consumer_group_member,
        get_category_messages.consumer_group_size;
    END IF;

    IF get_category_messages.consumer_group_member < 0 THEN
      RAISE EXCEPTION
        'Consumer group member must not be less than 0 (Consumer Group Member: %, Consumer Group Size: %)',
        get_category_messages.consumer_group_member,
        get_category_messages.consumer_group_size;
    END IF;

    IF get_category_messages.consumer_group_member >= get_category_messages.consumer_group_size THEN
      RAISE EXCEPTION
        'Consumer group member must be less than the group size (Consumer Group Member: %, Consumer Group Size: %)',
        get_category_messages.consumer_group_member,
        get_category_messages.consumer_group_size;
    END IF;

    _command := _command || ' AND
      MOD(@hash_64(cardinal_id(stream_name)), $6) = $5';
  END IF;

  IF get_category_messages.condition IS NOT NULL THEN
    IF current_setting('message_store.sql_condition', true) IS NULL OR
        current_setting('message_store.sql_condition', true) = 'off' THEN
      RAISE EXCEPTION
        'Retrieval with SQL condition is not activated';
    END IF;

    _command := _command || ' AND
      (%s)';
    _command := format(_command, get_category_messages.condition);
  END IF;

  _command := _command || '
    ORDER BY
      global_position ASC';

  IF get_category_messages.batch_size != -1 THEN
    _command := _command || '
      LIMIT
        $3';
  END IF;

  IF current_setting('message_store.debug_get', true) = 'on' OR current_setting('message_store.debug', true) = 'on' THEN
    RAISE NOTICE '» get_category_messages';
    RAISE NOTICE 'category ($1): %', get_category_messages.category;
    RAISE NOTICE 'position ($2): %', get_category_messages.position;
    RAISE NOTICE 'batch_size ($3): %', get_category_messages.batch_size;
    RAISE NOTICE 'correlation ($4): %', get_category_messages.correlation;
    RAISE NOTICE 'consumer_group_member ($5): %', get_category_messages.consumer_group_member;
    RAISE NOTICE 'consumer_group_size ($6): %', get_category_messages.consumer_group_size;
    RAISE NOTICE 'condition: %', get_category_messages.condition;
    RAISE NOTICE 'Generated Command: %', _command;
  END IF;

  RETURN QUERY EXECUTE _command USING
    get_category_messages.category,
    get_category_messages.position,
    get_category_messages.batch_size,
    get_category_messages.correlation,
    get_category_messages.consumer_group_member,
    get_category_messages.consumer_group_size::smallint;
END;
$$ LANGUAGE plpgsql
VOLATILE;

CREATE OR REPLACE FUNCTION get_last_stream_message(
  stream_name varchar,
  type varchar DEFAULT NULL
)
RETURNS SETOF message
AS $$
DECLARE
  _command text;
BEGIN
  _command := '
    SELECT
      id::varchar,
      stream_name::varchar,
      type::varchar,
      position::bigint,
      global_position::bigint,
      data::varchar,
      metadata::varchar,
      time::timestamp
    FROM
      messages
    WHERE
      stream_name = $1';

  IF get_last_stream_message.type IS NOT NULL THEN
    _command := _command || ' AND
      type = $2';
  END IF;

  _command := _command || '
    ORDER BY
      position DESC
    LIMIT
      1';

  IF current_setting('message_store.debug_get', true) = 'on' OR current_setting('message_store.debug', true) = 'on' THEN
    RAISE NOTICE '» get_last_message';
    RAISE NOTICE 'stream_name ($1): %', get_last_stream_message.stream_name;
    RAISE NOTICE 'type ($2): %', get_last_stream_message.type;
    RAISE NOTICE 'Generated Command: %', _command;
  END IF;

  RETURN QUERY EXECUTE _command USING
    get_last_stream_message.stream_name,
    get_last_stream_message.type;
END;
$$ LANGUAGE plpgsql
VOLATILE;

CREATE OR REPLACE FUNCTION get_stream_messages(
  stream_name varchar,
  "position" bigint DEFAULT 0,
  batch_size bigint DEFAULT 1000,
  condition varchar DEFAULT NULL
)
RETURNS SETOF message
AS $$
DECLARE
  _command text;
  _setting text;
BEGIN
  IF is_category(get_stream_messages.stream_name) THEN
    RAISE EXCEPTION
      'Must be a stream name: %',
      get_stream_messages.stream_name;
  END IF;

  position := COALESCE(position, 0);
  batch_size := COALESCE(batch_size, 1000);

  _command := '
    SELECT
      id::varchar,
      stream_name::varchar,
      type::varchar,
      position::bigint,
      global_position::bigint,
      data::varchar,
      metadata::varchar,
      time::timestamp
    FROM
      messages
    WHERE
      stream_name = $1 AND
      position >= $2';

  IF get_stream_messages.condition IS NOT NULL THEN
    IF current_setting('message_store.sql_condition', true) IS NULL OR
        current_setting('message_store.sql_condition', true) = 'off' THEN
      RAISE EXCEPTION
        'Retrieval with SQL condition is not activated';
    END IF;

    _command := _command || ' AND
      (%s)';
    _command := format(_command, get_stream_messages.condition);
  END IF;

  _command := _command || '
    ORDER BY
      position ASC';

  IF get_stream_messages.batch_size != -1 THEN
    _command := _command || '
      LIMIT
        $3';
  END IF;

  IF current_setting('message_store.debug_get', true) = 'on' OR current_setting('message_store.debug', true) = 'on' THEN
    RAISE NOTICE '» get_stream_messages';
    RAISE NOTICE 'stream_name ($1): %', get_stream_messages.stream_name;
    RAISE NOTICE 'position ($2): %', get_stream_messages.position;
    RAISE NOTICE 'batch_size ($3): %', get_stream_messages.batch_size;
    RAISE NOTICE 'condition ($4): %', get_stream_messages.condition;
    RAISE NOTICE 'Generated Command: %', _command;
  END IF;

  RETURN QUERY EXECUTE _command USING
    get_stream_messages.stream_name,
    get_stream_messages.position,
    get_stream_messages.batch_size;
END;
$$ LANGUAGE plpgsql
VOLATILE;

CREATE OR REPLACE FUNCTION hash_64(
  value varchar
)
RETURNS bigint
AS $$
DECLARE
  _hash bigint;
BEGIN
  SELECT left('x' || md5(hash_64.value), 17)::bit(64)::bigint INTO _hash;
  return _hash;
END;
$$ LANGUAGE plpgsql
IMMUTABLE;

CREATE OR REPLACE FUNCTION id(
  stream_name varchar
)
RETURNS varchar
AS $$
DECLARE
  _id_separator_position integer;
BEGIN
  _id_separator_position := STRPOS(id.stream_name, '-');

  IF _id_separator_position = 0 THEN
    RETURN NULL;
  END IF;

  RETURN SUBSTRING(id.stream_name, _id_separator_position + 1);
END;
$$ LANGUAGE plpgsql
IMMUTABLE;

CREATE OR REPLACE FUNCTION is_category(
  stream_name varchar
)
RETURNS boolean
AS $$
BEGIN
  IF NOT STRPOS(is_category.stream_name, '-') = 0 THEN
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql
IMMUTABLE;

CREATE OR REPLACE FUNCTION stream_version(
  stream_name varchar
)
RETURNS bigint
AS $$
DECLARE
  _stream_version bigint;
BEGIN
  SELECT
    max(position) into _stream_version
  FROM
    messages
  WHERE
    messages.stream_name = stream_version.stream_name;

  RETURN _stream_version;
END;
$$ LANGUAGE plpgsql
VOLATILE;

CREATE OR REPLACE FUNCTION write_message(
  id varchar,
  stream_name varchar,
  "type" varchar,
  data jsonb,
  metadata jsonb DEFAULT NULL,
  expected_version bigint DEFAULT NULL
)
RETURNS bigint
AS $$
DECLARE
  _message_id uuid;
  _stream_version bigint;
  _next_position bigint;
BEGIN
  PERFORM acquire_lock(write_message.stream_name);

  _stream_version := stream_version(write_message.stream_name);

  IF _stream_version IS NULL THEN
    _stream_version := -1;
  END IF;

  IF write_message.expected_version IS NOT NULL THEN
    IF write_message.expected_version != _stream_version THEN
      RAISE EXCEPTION
        'Wrong expected version: % (Stream: %, Stream Version: %)',
        write_message.expected_version,
        write_message.stream_name,
        _stream_version;
    END IF;
  END IF;

  _next_position := _stream_version + 1;

  _message_id = uuid(write_message.id);

  INSERT INTO messages
    (
      id,
      stream_name,
      position,
      type,
      data,
      metadata
    )
  VALUES
    (
      _message_id,
      write_message.stream_name,
      _next_position,
      write_message.type,
      write_message.data,
      write_message.metadata
    )
  ;

  IF current_setting('message_store.debug_write', true) = 'on' OR current_setting('message_store.debug', true) = 'on' THEN
    RAISE NOTICE '» write_message';
    RAISE NOTICE 'id ($1): %', write_message.id;
    RAISE NOTICE 'stream_name ($2): %', write_message.stream_name;
    RAISE NOTICE 'type ($3): %', write_message.type;
    RAISE NOTICE 'data ($4): %', write_message.data;
    RAISE NOTICE 'metadata ($5): %', write_message.metadata;
    RAISE NOTICE 'expected_version ($6): %', write_message.expected_version;
    RAISE NOTICE '_stream_version: %', _stream_version;
    RAISE NOTICE '_next_position: %', _next_position;
  END IF;

  RETURN _next_position;
END;
$$ LANGUAGE plpgsql
VOLATILE;
