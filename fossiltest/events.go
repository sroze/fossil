package fossiltest

import (
	cloudevents "github.com/cloudevents/sdk-go"
	"github.com/sroze/fossil"
	"testing"
)

func NewEvent(id string, stream string, number int, sequenceNumberInStream int) cloudevents.Event {
	event := cloudevents.NewEvent("0.3")
	event.SetType("type")
	event.SetSource("/my/system")
	event.SetID(id)

	if stream != "" {
		event.SetExtension(fossil.StreamExtensionName, stream)
	}
	if number != 0 {
		fossil.SetEventNumber(&event, number)
	}
	if sequenceNumberInStream != 0 {
		event.SetExtension(fossil.SequenceNumberInStreamExtensionName, sequenceNumberInStream)
	}

	return event
}

func ExpectEventWithId(t *testing.T, event cloudevents.Event, id string) {
	if event.ID() != id {
		t.Errorf("expected id %s, got %s", id, event.ID())
	}
}
