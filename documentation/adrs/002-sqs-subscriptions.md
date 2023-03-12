# SQS subscriptions

- A subscription is related to `store` and has a given `category` that cannot be changed.
-

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
