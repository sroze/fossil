# SQS targets

## Context

- Ordered durable subscriptions introduce a pretty hard reliability challenge: if one message
  of the ordered stream fails, the consumers will be stuck and won't process events in front of it.

- SQS FIFO queues are ordered, and using the "group id" feature, we can ensure that messages
  are processed in order, within a particular group. With the group being the stream identifier,
  we can ensure that messages are processed in order, within a stream, while having a pretty
  high concurrency.

- We can use SQS FIFO queues to implement durable subscriptions. Or in other words, we want to
  make it _super_ easy to forward durable subscriptions' events to an SQS (hosted or bring-your-own).

## Options

# We could distribute "tasks" across nodes

- Raft is complicated

# Instead, we do a pull model.

- KISS with a single node for now
  - GO for concurrency.

# We can scale by sharding later.

"workers" are aware of their number and the total count.

# We can distribute premium subscriptions as their own pods

- We can tag subscriptions based on "type" or "scheme"
  - Then, we could deploy "premium" as a single K8S pod running the Go.

# Consequences

- SQS's item size is 262,144 bytes (256 KiB).
- SQS's default retention is 4 days!
