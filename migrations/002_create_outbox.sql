create table outbox(
  id serial primary key,
  stream varchar not null,
  event json not null
);

---- create above / drop below ----

drop table events;
