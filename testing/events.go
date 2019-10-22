package testing

import (
	cloudevents "github.com/cloudevents/sdk-go"
	"github.com/sroze/fossil/events"
	"testing"
)

func NewEvent(id string, stream string, number int, sequenceNumberInStream int) cloudevents.Event {
	event := cloudevents.NewEvent("0.3")
	event.SetType("type")
	event.SetSource("/my/system")
	event.SetID(id)

	if stream != "" {
		events.SetStream(&event, stream)
	}
	if number != 0 {
		events.SetEventNumber(&event, number)
	}
	if sequenceNumberInStream != 0 {
		events.SetSequenceNumberInStream(&event, sequenceNumberInStream)
	}

	return event
}

func ExpectEventWithId(t *testing.T, event cloudevents.Event, id string) {
	if event.ID() != id {
		t.Errorf("expected id %s, got %s", id, event.ID())
	}
}
