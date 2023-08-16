package simplestore

import (
	"fmt"
)

func AddStreamToMetadata(event Event, stream string) Event {
	eventMetadata := map[string]string{
		"$stream": stream,
	}

	for k, v := range event.Metadata {
		if k == "$stream" {
			continue
		}

		eventMetadata[k] = v
	}

	return Event{
		EventId:   event.EventId,
		EventType: event.EventType,
		Payload:   event.Payload,
		Metadata:  eventMetadata,
	}
}

func GetStreamFromMetadata(event Event) (string, error) {
	stream, ok := event.Metadata["$stream"]
	if !ok {
		return "", fmt.Errorf("event #%s has no stream metadata", event.EventId)
	}

	return stream, nil
}
