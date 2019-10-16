# Fossil

Fossil is an event collector, with built-in consistency proofs, optional consumer acknowlegment and schema validation; 
built upon standards such as the [CloudEvents spec](https://github.com/cloudevents/spec) & [JSON schema](https://json-schema.org/). 
By default, it uses PostgreSQL for consistency, Kafka for messaging. 

## Usage

```
POST /collect HTTP/1.1
Host: webhook.example.com
ce-specversion: 1.0
ce-type: https://acme.com/PersonCreated
ce-time: 2018-04-05T03:56:24Z
ce-id: 1234-1234-1234
ce-source: /mycontext/subcontext
Content-Type: application/cloudevents+json; charset=utf-8
Content-Length: nnnn

{
    ... application data ...
}
```

## TODO

- (Code & Documentation) Get & validate schema from event type
- (Code & Documentation) Publish event to streams from schema
- (Code & Documentation) Uses the [outbox pattern](https://microservices.io/patterns/data/transactional-outbox.html) to publish messages to Kafka when an event is written.
- (Code & Documentation) JWT authentication for public-facing API
- (Code & Documentation) "Type to _streams_" mapping: within the JSON schema?
- (Documentation) Acknowledgement headers
- (Code & Documentation) Drift checker

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
$ watcher
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
