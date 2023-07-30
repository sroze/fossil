# ADR 2: Cross-stream reading will be done through "dynamic" reverse-indexes

## Challenge

- While we can easily provide a log of events within a single stream, 
  we can't easily provide a log of events across multiple streams.

## Considered Options


### 1. Store-wide log

With FoundationDB, we can have a store-wide log of events through implementing a global index
with versionstamps (see https://www.youtube.com/watch?v=64UzH5p-bw0). Concretly, we would write a
a value in `/log/<versionstamp>` for each write and be able to sequentially read the log.

Cons:
- This would be a single log across all streams, which would create hotspots on the read-path 
  and considerable unnecessary I/O due to filtering.

**Note:** we need to understand how this `versionstamp` works because it is slightly worrying capability,
which could mean that FDB inherently still is single-writer.

### 2. Log per store

We could have a log per store (e.g. `/log/<store>/<versionstamp>`). This removes our hotspot problem when scaling the
number of stores but doesn't really account for very large stores, which would still be subject to hotspots.

### 3. Dynamic logs

We could dynamically create "logs" (or "log indexes") which would apply for a specific 'prefix' of the key-value store.
This would allow us to scale horizontally and avoid hotspots, assuming these log indexes can dynamically change over time
depending on usage, across or within the store.

1. We would start with a single root log: `/log/<versionstamp>`.
2. As a few stores become hot, we would then create a new log for each of these stores: `/log/<store>/<versionstamp>`.
3. As a few streams within a store become hot, we would then create a new log for each of these streams: `/log/<store>/<stream-prefix>/<versionstamp>`.

## Decision

We will implement a dynamic log system, where we can create logs for specific prefixes of the key-value store. Initially,
it is likely that we will only have a single log for the entire store, but we will be able to scale horizontally as needed.
