package simplestore

import (
	"github.com/google/uuid"
)

// GenerateStreamWriteRequests generates write requests for a specific stream
func GenerateStreamWriteRequests(stream string, count int) []AppendToStream {
	var writes []AppendToStream
	for i := 0; i < count; i++ {
		writes = append(writes, AppendToStream{
			Stream: stream,
			Events: []Event{
				{
					EventId:   uuid.NewString(),
					EventType: "AnEventOfTypeFoo",
					Payload:   []byte("foo"),
				},
			},
		})
	}
	return writes
}

// GenerateEventWriteRequests generates a list of AppendToStream requests and a map of stream name to event IDs.
func GenerateEventWriteRequests(samples int, numberOfEventsPerStream int, prefix string) ([]AppendToStream, map[string][]string) {
	var streams []string
	for i := 0; i < samples; i++ {
		streams = append(streams, prefix+uuid.NewString())
	}

	var writes []AppendToStream
	writtenEventsPerStream := make(map[string][]string)
	for i := 0; i < numberOfEventsPerStream; i++ {
		for _, stream := range streams {
			eventId := uuid.NewString()
			writtenEventsPerStream[stream] = append(writtenEventsPerStream[stream], eventId)

			writes = append(writes, AppendToStream{
				Stream: stream,
				Events: []Event{
					{
						EventId:   eventId,
						EventType: "AnEventOfTypeFoo",
						Payload:   []byte("foo"),
					},
				},
			})
		}
	}
	return writes, writtenEventsPerStream
}
