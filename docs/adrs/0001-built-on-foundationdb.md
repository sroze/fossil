# ADR: Building Fossil ("v3") on top of FoundationDB

TL;DR

- An event store today needs to scale horizontally, to petabytes of data on hundreds of nodes.
- There is a significant amount of work needed on the storage layer to guarantee durability, consistency, and availability
  for multi-node solutions. While we could build a Raft-based storage layer, it is not a good use of our time.
- FoundationDB is a distributed key-value store that provides ACID guarantees, and is built for horizontal scalability.
- We will build Fossil on top of FoundationDB, and use it as our storage layer (same as a SQL database would).

