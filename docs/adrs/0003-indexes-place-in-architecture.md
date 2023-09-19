# ADR 3: Indexes' place in the architecture

# Context

We need to write into one or multiple indexes (see ADR #2) in addition to writing events in the store. All of
these writes need to be done within a single transaction to guarantee consistency and the content of these
indexes need to strictly guarantee order (within each single stream only, we don't guarantee order cross-stream).

# Options

This section expands on the various choices to be made and options considered.

## Order of indexes' keys

1. Using a database atomically written increment (i.e. `/index/{id}/{counter}`)
   Not possible given it would expose us to wrong ordering with concurrent transactions. See ["the sync problem"](https://www.youtube.com/watch?v=64UzH5p-bw0).

2. Using an application-incremented integer.
   It means we'd have to implement distributed locking in the application and essentially have a single writer
   per index, which would _greatly_ decrease write performance. Performance-compatible solutions like
   location-aware writer with zero network round-trip are quite complex. 

3. Rely on FoundationDB's internal details and their [versionstamps](https://apple.github.io/foundationdb/data-modeling.html#versionstamps).
   While this sounds like a great solution, it means we are inherently building a strong dependency to FoundationDB
   and won't easily be able to switch with other alternatives like TiKV, DynamoDB or BigTable. 

**Decision:** we will start with 3, relying on FoundationDB's internals.

## Content of the indexes' values.

1. We could store references, with such (key, value) pair in the index:
   (`/index/{id}/{vs1}`, `/stream/foo/1`)
   (`/index/{id}/{vs2}`, `/stream/bar/1`)
   (`/index/{id}/{vs3}`, `/stream/foo/2`)
   ...
    
   It however means that for read operations, we'd have to scan then lookup. It is likely
   to introduce a significant large latency. However, FoundationDB's authors claim that
   it is built for concurrent read and becomes faster as the concurrency increases.

2. We could duplicate events.
   Events are immutable: we can benefit from this and duplicate events directly. This however,
   this means that each index cost us much more storage space and that we (will) need to
   synchronise the deletion of events across indexes.

**Decision:** we will start with 1, storing references. The main rationale is first that event stores 
can easily get to petabytes of data and duplicating events can have a non-significant cost, we don't
want storing "old" events to be a cost factor. Second, reads on indexes will often happen "from a particular index"
because clients are subscribing. Reading the whole history won't be very frequent. As such, performance impact
of scan + (concurrent) lookup is unlikely to be significant.
   

## Logical architecture of Fossil's internals

Should `streamstore` (that currently only cares about events _within_ a stream) be really aware of indexes? 
Ideally, we don't want it to be the case, so we can keep small and consistent modules, with which we build on top.
As such, we will create a independent `index` module. 

How does `index` module write in the same FoundationDB transaction than `streamstore`'s append?
1. It uses `streamstore.Write` and we introduce a special `$versionstamp` variable-scheme in the stream name.
2. `streamstore` exposes `OnWrite` extension point, which `index` is registered to and it receives FoundationDB's `fdb.Transaction`

**Decision:** we will start with 2, as it is the simplest solution, both tie us to FoundationDB either way, it's better
to be explicit than building an abstraction at this stage.
