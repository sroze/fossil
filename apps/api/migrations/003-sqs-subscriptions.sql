CREATE TABLE "sqs_subscriptions" (
  store_id UUID NOT NULL,
  subscription_id UUID NOT NULL,
  subscription_category TEXT NOT NULL,
  sqs_queue_url TEXT NOT NULL,
  position BIGINT NOT NULL,
  PRIMARY KEY (store_id, subscription_id)
);
