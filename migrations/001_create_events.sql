create table events(
  id uuid primary key,
  stream varchar not null,
  payload json not null
);

---- create above / drop below ----

drop table events;
