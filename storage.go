package fossil

import (
	"context"
	cloudevents "github.com/cloudevents/sdk-go"
)

type EventStore interface {
	Store(context context.Context, stream string, event cloudevents.Event) error
}

// Errors
type DuplicateEventError struct {}
func (e *DuplicateEventError) Error() string {
	return "event with such identifier already exists."
}
