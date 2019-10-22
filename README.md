# Fossil

Fossil is an event collector, with built-in consistency proofs, optional consumer acknowlegment and schema validation; 
built upon standards such as the [CloudEvents spec](https://github.com/cloudevents/spec) & [JSON schema](https://json-schema.org/). 
By default, it uses PostgreSQL for consistency, Kafka for messaging. 

## Usage

### Collect an event 

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

```
curl -N --http2 -H "Accept: text/event-stream"  http://localhost:8080/stream?matcher=%2Fvisits%2F%2A -vvv
```

#### Only get events from a certain number

```
curl -N --http2 -H "Accept: text/event-stream" -H 'Last-Event-Id: 123' http://localhost:8080/stream?matcher=%2Fvisits%2F%2A -vvv
```

(this will exclude the event 123 and send only what's after)

#### As a consumer group

```
curl -N --http2 -H "Accept: text/event-stream" http://localhost:8080/consumer/{name}/stream?matcher=%2Fvisits%2F%2A -vvv
```

Acknowledges the messages by sending the following request:
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

- (Code & Documentation) Outbox to Kafka
- (Code & Documentation) Lock the websocket client per "consumer group" (so guarantee ordering in receiver - because no partition = one consumer) | https://stackoverflow.com/a/26081687 | Or use PgSQL's advisory lock to load-balance
- (Code & Documentation) Set expected version number when collecting
- (Code & Documentation) Get & validate schema from event type
- (Code & Documentation) JWT authentication for public-facing API
- (Code & Documentation) "Type to _streams_" mapping: within the JSON schema?
- (Code & Documentation) Acknowledgement

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
