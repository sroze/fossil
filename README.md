# Fossil

Fossil is an event collector, with built-in consistency proofs, optional consumer acknowlegment and schema validation; 
built upon standards such as the [CloudEvents spec](https://github.com/cloudevents/spec) & [JSON schema](https://json-schema.org/). 
By default, it uses PostgreSQL for consistency, Kafka for messaging. 

## Usage

### Collect an event 

```
POST /collect HTTP/1.1
Host: webhook.example.com
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
curl -N --http2 -H "Accept:text/event-stream"  http://localhost:8080/stream?matcher=%2Fvisits%2F%2A -vvv
```

## TODO

- (Code & Documentation) Send events only from the `Last-Event-Id`
- (Code & Documentation) Consumer group (i.e. automated `Last-Event-Id` with name)
- (Code & Documentation) Lock the websocket client per "consumer group" (so guarantee ordering in receiver - because no partition = one consumer) | https://stackoverflow.com/a/26081687
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

## OSX

You need to install Kafka's library, `librdkafka`
```
brew install librdkafka pkg-config
```
