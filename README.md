# Fossil

Fossil is an event store built on top of PostgreSQL. It has built-in consistency proofs, named consumers (tracking which
messages have been processed), consumer acknowledgment and schema validation. It is built on industry standards such as 
the [CloudEvents spec](https://github.com/cloudevents/spec) & [JSON schema](https://json-schema.org/). 

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

When the consumer is done with one (or multiple if you want to batch), acknowledges the message(s) by sending 
the latest known event number to the `/consumer/{name}/ack` endpoint:
```
curl -X PUT -H 'Last-Event-Id: 123' http://localhost:8080/consumer/{name}/ack
```

### Delete or replace an event

For multiple valid reasons (GDPR for example) it is important to be able to delete an event. Fossil does not support
deletion but handles replacement. In order to delete, you would therefore replace an existing event with another
value, meaning deletion.

```
curl -X POST -H 'Last-Event-Id: 123' \
     -H 'Fossil-Replace: true' \
     ...all other headers... \
     --data '...replacement value...'
     http://localhost:8080/collect
```

## TODO

- (Code & Documentation) Set expected version number when collecting
- (Code & Documentation) JWT authentication for public-facing API
- (Code & Documentation) Get & validate schema from event type
- (Code & Documentation) "Type to _streams_" mapping: within the JSON schema?
- (Code & Documentation) Acknowledgement
- (Code & Documentation) Outbox to Kafka

## FAQ

### Why is the `type` a URI in the example?

When the `type` is a URI, Fossil is able to fetch the JSON schema at this URL (using the `Accept: application/json+schema` header). 
The schema is then used to validates the contents of the event (when applicable) and to know which stream(s)
should the event be published to.

## Development

```
$ go test
```

```
$ go run cmd/main.go
(or)
$ cd cmd && watcher -watch github.com/sroze/fossil
```

Run migrations:

```
$ cd migrations
$ tern migrate
```

**Note:** You need `pgx@v3.6.0`: `cd $GOPATH/src/github.com/jackc/pgx && git checkout v3.6.0`
