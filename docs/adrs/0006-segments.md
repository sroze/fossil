# ADR 6: Segments

## Context

- We prototyped with FoundationDB and as described in ADR #2 & #3, we'd need to rely on FDB's `versionstamp`
  to make this work. While this is possible, I have growing concerns over FDB's future -- from Apple's commitment
  to the project to the lack of community and documentation.

- ADR #4 proposed to tackle the above concerns in a way that allocated segments to individual nodes, which would
  then be responsible for writing to these segments. While the approach is sound the single-writer element forced 
  us to have a relatively complex hand-over process, which would have been a significant performance bottleneck 
  and complexity. It also introduced limitations, such as our inability to transactionaly write across segments.

## Why segments?

- Break down the store into smaller units, in time & space.
    - In space, many segments running concurrently, to increase write throughout. At its maximum, a segment contains a single stream.
    - In time, so that
        - Number of segments can evolve over time (e.g. as we scale horizontally, manually or automatically).
        - We can close segments and move them around (in slower but cheaper storage, for instance).

## How do we handle ordering and single-writing in segments?

- We rely on "conditional writes" on KVs' site.
