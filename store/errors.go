package store

import (
	"fmt"
	"time"
)

type EventNotFound struct{}

func (e *EventNotFound) Error() string {
	return "event with such identifier is not found."
}

type DuplicateEventError struct{}

func (e *DuplicateEventError) Error() string {
	return "event with such identifier already exists."
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
