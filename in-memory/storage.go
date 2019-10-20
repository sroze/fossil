package in_memory

import (
	"context"
	cloudevents "github.com/cloudevents/sdk-go"
	"github.com/sroze/fossil"
)

type EventInStream struct {
	event *cloudevents.Event
	stream string
}

type InMemoryStorage struct {
	Events []EventInStream
}

func NewInMemoryStorage() *InMemoryStorage {
	return &InMemoryStorage{
		Events: make([]EventInStream, 0),
	}
}

func (s *InMemoryStorage) Store(ctx context.Context, stream string, event *cloudevents.Event) error {
	s.Events = append(s.Events, EventInStream{event, stream })

	fossil.SetEventNumber(event, len(s.Events))
	event.SetExtension(fossil.SequenceNumberInStreamExtensionName, s.countEventsInStream(stream))

	return nil
}

func (s *InMemoryStorage) MatchingStream(ctx context.Context, matcher string) chan cloudevents.Event {
	c := make(chan cloudevents.Event)

	go func() {
		for _, record := range s.Events {
			if fossil.StreamMatches(record.stream, matcher) {
				c <- *record.event
			}
		}

		close(c)
	}()

	return c
}

func (s *InMemoryStorage) countEventsInStream(stream string) int {
	count := 0

	for _, row := range s.Events {
		if row.stream == stream {
			count++
		}
	}

	return count
}
