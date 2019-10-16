package storage

import cloudevents "github.com/cloudevents/sdk-go"

type EventStoreTransaction interface {
	Store(stream string, event cloudevents.Event) error

	Commit() error
	Rollback() error
}

type EventStore interface {
	NewTransaction() (EventStoreTransaction, error)
}

// Errors
type DuplicateEventError struct {}
func (e *DuplicateEventError) Error() string {
	return "event with such identifier already exists."
}
