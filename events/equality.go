package events

import (
	"bytes"
	cloudevents "github.com/cloudevents/sdk-go"
)

func EventsAreEquals(left cloudevents.Event, right cloudevents.Event) (bool, error) {
	if left.ID() != right.ID() {
		return false, nil
	}

	if left.Type() != right.Type() {
		return false, nil
	}

	leftBytes, err := left.DataBytes()
	if err != nil {
		return false, err
	}
	rightBytes, err := right.DataBytes()
	if err != nil {
		return false, err
	}

	if bytes.Compare(leftBytes, rightBytes) != 0 {
		return false, nil
	}

	if GetEventNumber(left) != 0 && GetEventNumber(right) != 0 {
		if GetEventNumber(left) != GetEventNumber(right) {
			return false, nil
		}
	}

	if GetExpectedSequenceNumber(left) != 0 && GetExpectedSequenceNumber(right) != 0 {
		if GetExpectedSequenceNumber(left) != GetExpectedSequenceNumber(right) {
			return false, nil
		}
	}

	if GetStreamFromEvent(left) != GetStreamFromEvent(right) {
		return false, nil
	}

	return true, nil
}
