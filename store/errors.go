package store

import (
	"fmt"
	cloudevents "github.com/cloudevents/sdk-go"
	"time"
)

type EventNotFound struct{}

func (e *EventNotFound) Error() string {
	return "event with such identifier is not found."
}

func NewDuplicateEventError(eventInStore cloudevents.Event) error {
	return &DuplicateEventError{eventInStore}
}

type DuplicateEventError struct {
	eventInStore cloudevents.Event
}

func (e *DuplicateEventError) Error() string {
	return "event with such identifier already exists."
}

func (e *DuplicateEventError) EventInStore() cloudevents.Event {
	return e.eventInStore
}

type SequenceNumberDoNotMatchError struct{}

func (e *SequenceNumberDoNotMatchError) Error() string {
	return "Expected event sequence number does not match."
}

type ConsumerTimedOut struct {
	WaitConsumerConfiguration
}

func (e *ConsumerTimedOut) Error() string {
	return fmt.Sprintf("Consumer %s did not acknowleged in %dms.", e.WaitConsumerConfiguration.ConsumerName, e.WaitConsumerConfiguration.Timeout/time.Millisecond)
}
