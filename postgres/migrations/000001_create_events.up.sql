create table events(
  number bigserial not null primary key,
  id uuid not null,
  stream varchar not null,
  sequence_number_in_stream integer not null,
  event json not null
);

ALTER TABLE events ADD CONSTRAINT events_unique_id UNIQUE(id);
ALTER TABLE events ADD CONSTRAINT events_unique_sequence_per_stream UNIQUE(stream, sequence_number_in_stream);

CREATE OR REPLACE FUNCTION generate_stream_sequence_number(_stream varchar) RETURNS integer AS
$body_start$
BEGIN
    RETURN (SELECT COALESCE(MAX(sequence_number_in_stream) + 1, 1) FROM events WHERE stream = _stream);
END;
$body_start$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_stream_sequence_number_for_new_event() RETURNS trigger AS
$body_start$
BEGIN
    SELECT generate_stream_sequence_number(NEW.stream) INTO NEW.sequence_number_in_stream;

    RETURN NEW;
END
$body_start$ LANGUAGE plpgsql;

CREATE TRIGGER automatically_generate_stream_sequence_number BEFORE INSERT ON events
    FOR EACH ROW
    WHEN (NEW.sequence_number_in_stream IS NULL)
    EXECUTE PROCEDURE generate_stream_sequence_number_for_new_event();
