# Durable subscriptions

## Decision

- The subscription "offsets" will be persisted in the store, preventing clients to have to keep
  track of them.

- We add another `subscriptions` claim to our JWT tokens, which will be used to authorize
  subscriptions.

  - The `subscriptions` claim will be a list of subscription matchers, which will be used to
    authorize subscriptions.

  - A subscription matcher can be:
  - `*` to indicate any subscription.
  - The literal value (i.e. name of the subscription)

- We will use a "pull" model for subscriptions, where the client will have to poll the server
- for new events.

  - The client will have to provide the subscription name, the last known offset, and the
    maximum number of events to fetch.

  - The server will respond with a list of events, and the new offset.

  - The client will have to keep track of the offset, and use it for the next request.
  - The client can "commit" the offset, so the server remembers it. This is useful for
    "durable" subscriptions.
