# Fossil

Fossil is an event store built on top of PostgreSQL. It has built-in consistency proofs, named consumers (tracking which
messages have been processed), consumer acknowledgment and schema validation. It uses the industry standard [CloudEvents specification](https://github.com/cloudevents/spec)
for its exposed APIs.

## Usage

### Collect an event

Fossil exposes a `/collect` endpoint to which you can send events using the [CloudEvents HTTP binding spec](https://github.com/cloudevents/spec/blob/master/http-protocol-binding.md).
Use the `Fossil-Stream` header to specify which stream is the event belonging to.

```
POST /collect HTTP/1.1
Host: fossil.example.com
ce-specversion: 1.0
ce-type: https://acme.com/PersonCreated
ce-time: 2018-04-05T03:56:24Z
ce-id: 1234-1234-1234
ce-source: /mycontext/subcontext
fossil-stream: /visits/123
Content-Type: application/cloudevents+json; charset=utf-8
Content-Length: nnnn

{
    ... application data ...
}
```

### Stream events

Fossil exposes a SSE ([Server Sent Event](https://en.wikipedia.org/wiki/Server-sent_events))
endpoint allowing you to stream events matching a specific topic:

```
curl -N --http2 -H "Accept: text/event-stream"  http://localhost:8080/stream?matcher=%2Fvisits%2F%2A -vvv
```

**Important note:** this will return all the events matching the `matcher`(s) that have been stored in Fossil so far,
so please be aware of the potential amount of events.

#### Only get events from a certain point in time

Every Fossil event has an event number, unique (and incremental in time) across the event store. 
You can stream only events above a given number by using the SSE's `Last-Event-Id` header:

```
curl -N --http2 -H "Accept: text/event-stream" -H 'Last-Event-Id: 123' http://localhost:8080/stream?matcher=%2Fvisits%2F%2A -vvv
```

(this will exclude the event 123 and send only what's after)

#### As a named consumer

Fossil has the ability to keep track of what a given consumer has read so far. Give a name to the consumer
and use the `/consumer/{name}/stream` endpoint. This will only get you the message that have not yet been acknowledged:

```
curl -N --http2 -H "Accept: text/event-stream" http://localhost:8080/consumer/{name}/stream?matcher=%2Fvisits%2F%2A -vvv
```

When the consumer is done with one (or multiple if you want to batch), commit its offset by sending 
the latest known event identifier to the `/consumer/{name}/commit` endpoint:
```
curl -X PUT -H 'Last-Event-Id: 123' http://localhost:8080/consumer/{name}/commit
```

**Note:** You can also commit with the `Last-Fossil-Event-Number` header if you want to use the event number rather
than their identifiers. This would actually be faster than using `Last-Event-Id` which is exposed for SSE compatibility.

### Delete or replace an event

For multiple valid reasons (GDPR for example) it is important to be able to delete an event. Fossil does not support
deletion but handles replacement. In order to delete, you would therefore replace an existing event with another
value, meaning deletion.

```
curl -X POST -H 'Fossil-Replace: true' \
     ...all other headers... \
     --data '...replacement value...'
     http://localhost:8080/collect
```

### Consistency

What separates a message bus to an event store is its ability to ensure consistency (within a stream, at least).
Fossil allows you to expect a sequence number when collecting an event, using the `Fossil-Expected-Sequence-Number` header.
It will returns a 409 if the sequence number is invalid.

```
curl -X POST -H 'Fossil-Expected-Sequence-Number: 12' \
     ...all other headers... \
     --data '...replacement value...'
     http://localhost:8080/collect
```

**Note:** you can get the event and sequence numbers from the events when streaming them or in the following HTTP headers
returned when collecting an event:
- `Fossil-Event-Number` The globally unique event number.
- `Fossil-Sequence-Number` The sequential event number in its stream.

### Wait for consumer acknowledgment

Eventual consistency means that your _frontends_ will have to handle the fact that some projections or processes might
not be done straight away. It usually means moving a lot of complexity on the _front-end_ (other APIs or SPAs) for them
to deal with this. However, in most of the case, your system will behave correctly and you can expect consumers to process
the messages within a certain time period. 

Fossil allows you to wait a certain amount of time for a given named consumer to have processed a message. If it times
out you will receive a `202 Accepted` HTTP response (instead of `200`). The `Fossil-Wait-Consumer` header allows you
to use this feature: 

```
curl -X POST -H 'Fossil-Wait-Consumer: <firstConsumerName>; timeout=1000, <secondConsumerName>; timeout=500' \
     ...all other headers... \
     --data '...replacement value...'
     http://localhost:8080/collect
```

**Note:** The format of the header matches the [`Link` HTTP header](https://tools.ietf.org/html/rfc8288#section-3).
Use the `timeout` parameter to explicit how many milliseconds will Fossil wait for the acknowledgment for this consumer.

In order to get the acknowledgement, the consumers needs to actually acknowledge this specific message. The consumer 
will receive a message with a `fossilexpectack` extension to know that it needs to do so. It will have to send a ack
request like this:
```
curl -X POST  \
     ...all other headers... \
     --data '{"consumer_name": "firstConsumerName"}'
     http://localhost:8080/events/{id}/ack
```

**Why not using named consumers' offset?** The point of the consumers' offset is that it can be batched together by

### Authentication

If you set the `JWT_SECRET` environment variable, Fossil will expect each HTTP request to be sent with a JWT token
signed with this secret in each HTTP request.

```
curl -X POST -H 'Authorization: Bearer <token>' \
     ...all other headers... \
     --data '...replacement value...'
     http://localhost:8080/collect
```

## Development

```
$ go test
```

```
$ go run main.go server
(or)
$ watcher -watch github.com/sroze/fossil
```

Run migrations:

```
$ go run main.go migrate
```

### Docker

```
goreleaser --snapshot --skip-publish --rm-dist
```

## Roadmap

As it stands, Fossil has enough features to be used as a complete event store. The focus going forward should be 
around changes giving operational confidence and better performances.

- **Node.js client** (using SSE) that commits offsets and supports acknowledgments.

- **JWT tokens with `claims`** so that we can create tokens that allow to stream or collect on a specific
  set of streams.
  
- **Use URI templates** rather than a custom `*`-based Kafka matcher. This would therefore be inline with the RFC6570.

- **Outbox to Kafka or SQS** to enable consumers to use alternatives to SSE.

- **Protobuf interfaces** instead of these HTTP endpoints. This should enable faster collection, commits, acks and
  streaming.
   
- **Automated Event Schema validation.**
  This could be very nicely done with types as resolvable URIs pointing to JSON schemas.

- **BigTable as distributed storage?**
  A PostgreSQL database can go very far (hundreds of millions of events). However, would it make sense to have an even bigger store
  such as BigTable, rather than splitting the store into multiple of them?

As usual with open source, _help is more than welcome._ Thank you.

## Credits

Created by [Samuel Rozé](https://twitter.com/samuelroze).
