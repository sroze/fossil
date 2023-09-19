# ADR 8: Stateless Position Comparison

##  The problem
- One of the main benefit of event sourcing is the ability to have read models. These read-models will be written asynchronously in various data stores. The price to pay for this flexibility is that applications have to handle eventual consistency.

State of the union
“handling eventual consistency” is about waiting for whatever read model to be caught up with a given write. A given write can be represented as its position in the store, either last position of the streams being written to, or the position in its segment.

Today, this means one of, depending on the use case:
- Storing the “last known position” of a stream on the read-model, when this read-model is constrained to reading from one or a very few streams.
- Storing the “last known position of the store”, somewhere.
    - Somewhere could be a specific key (in a KV store) per read-model.
    - With other event stores that have a global position identifier as integer, storing this global identifier along side each updated entity and `SELECT MAX(global_position) FROM table` works too.

With Fossil, given its horizontally scalable nature, the 2nd use-case is much more complicated. What we would need to compare is the position of the write in the written segment, versus the position cursor of _whatever_ is reading from the store to populate the read model.

However, currently, in order to compare these, we would need to have the topology of the segments in memory to be able to compare those positions. At reasonable scale, it would be a disaster for all parts who need to do this basic operation to have to rely on network hops to Fossil to get this up-to-date topology.

## The solution

Instead, we need to find a way to be able to compare positions in segments in a stateless manner. 
This can be done through replacing UUID segment identifiers with identifiers that can represent order while supporting split/merge operations.

### New segment identifiers

We’ll use a semver type of syntax.
- The first segment identifier is “1.0”

Scenario: replace
- We increment the last number.
- “1.0” becomes “1.1”

Scenario: split
- We increment the last number and add another level per split count and another “.0”
- “1.1” split in 3 becomes “1.2.1.0”, “1.2.2.0”, “1.2.3.0”
- “1.2.3.0” split in 2 becomes “1.2.3.1.1.0” and “1.2.3.1.2.0”

Scenario: merge
- We increase the highest common dominator
- “1.2.1.0”, “1.2.2.0” become “1.3”

Note: we can’t merge randomly anymore. We need to merge segments on a whole branch. To achieve specific topology transformations, we might have to merge all segments then split again, in the most complicated scenarios.

### The API

- We can wrap these positions cursors in easy APIs to enable clients to compare order.
- When the position of a consumer (i.e. its position cursor) is stored in Fossil, we can also
  enable clients to wait for a given position to be reached by the said consumer, by providing a blocking API.
