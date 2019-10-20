package fossil

import (
	"context"
	cloudevents "github.com/cloudevents/sdk-go"
)

type EventStore interface {
	Store(ctx context.Context, stream string, event *cloudevents.Event) error
}

type EventLoader interface {
	MatchingStream(ctx context.Context, matcher string) chan cloudevents.Event
}

// Errors
type DuplicateEventError struct{}

func (e *DuplicateEventError) Error() string {
	return "event with such identifier already exists."
}
