package in_memory

import (
	"context"
	cloudevents "github.com/cloudevents/sdk-go"
	"github.com/sroze/fossil"
)

type InMemoryStorage struct {
	Events []cloudevents.Event
}

func NewInMemoryStorage() *InMemoryStorage {
	return &InMemoryStorage{
		Events: make([]cloudevents.Event, 0),
	}
}

func (s *InMemoryStorage) Store(ctx context.Context, stream string, event *cloudevents.Event) error {
	s.Events = append(s.Events, *event)

	fossil.SetEventNumber(event, len(s.Events))
	event.SetExtension(fossil.SequenceNumberInStreamExtensionName, s.countEventsInStream(stream))

	return nil
}

func (s *InMemoryStorage) MatchingStream(ctx context.Context, matcher fossil.Matcher) chan cloudevents.Event {
	c := make(chan cloudevents.Event)

	go func() {
		for _, event := range s.Events {
			if fossil.EventMatches(event, matcher) {
				c <- event
			}
		}

		close(c)
	}()

	return c
}

func (s *InMemoryStorage) countEventsInStream(stream string) int {
	count := 0

	for _, event := range s.Events {
		if fossil.GetStreamFromEvent(event) == stream {
			count++
		}
	}

	return count
}
