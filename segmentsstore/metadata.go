package segmentsstore

import (
	"fmt"
	"github.com/sroze/fossil/streamstore"
)

func AddStreamToMetadata(event streamstore.Event, stream string) streamstore.Event {
	eventMetadata := map[string]string{
		"$stream": stream,
	}

	for k, v := range event.Metadata {
		if k == "$stream" {
			continue
		}

		eventMetadata[k] = v
	}

	return streamstore.Event{
		EventId:   event.EventId,
		EventType: event.EventType,
		Payload:   event.Payload,
		Metadata:  eventMetadata,
	}
}

func GetStreamFromMetadata(event streamstore.Event) (string, error) {
	stream, ok := event.Metadata["$stream"]
	if !ok {
		return "", fmt.Errorf("event #%s has no stream metadata", event.EventId)
	}

	return stream, nil
}
