package store

import (
	"context"
	cloudevents "github.com/cloudevents/sdk-go"
	"github.com/sroze/fossil/events"
)

type Publisher interface {
	Publish(context context.Context, stream string, event *cloudevents.Event) error
}

type Collector interface {
	Collect(context context.Context, event *cloudevents.Event) error
}

type EventStore interface {
	Store(ctx context.Context, stream string, event *cloudevents.Event) error
}

type EventLoader interface {
	MatchingStream(ctx context.Context, matcher events.Matcher) chan cloudevents.Event
}
