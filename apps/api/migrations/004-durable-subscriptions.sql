CREATE TABLE durable_subscriptions (
  store_id UUID NOT NULL,
  subscription_id UUID NOT NULL,
  subscription_category TEXT NOT NULL,
  last_known_checkpoint BIGINT NOT NULL,
  PRIMARY KEY (store_id, subscription_id)
);

CREATE INDEX durable_subscriptions_checkpoint ON durable_subscriptions(last_known_checkpoint);
