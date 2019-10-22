package in_memory

import (
	"context"
	cloudevents "github.com/cloudevents/sdk-go"
	"github.com/sroze/fossil/collector"
	"github.com/sroze/fossil/postgres"
	"github.com/sroze/fossil/streaming"
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
	err := s.addOrReplace(*event)
	if err != nil {
		return err
	}

	streaming.SetEventNumber(event, len(s.Events))
	streaming.SetSequenceNumberInStream(event, s.countEventsInStream(stream))

	return nil
}

func (s *InMemoryStorage) addOrReplace(event cloudevents.Event) error {
	for index, e := range s.Events {
		if e.ID() == event.ID() {
			if streaming.IsReplacingAnotherEvent(event) {
				s.Events[index] = event

				return nil
			}

			return &postgres.DuplicateEventError{}
		}
	}

	s.Events = append(s.Events, event)

	return nil
}

func (s *InMemoryStorage) MatchingStream(ctx context.Context, matcher collector.Matcher) chan cloudevents.Event {
	c := make(chan cloudevents.Event)

	go func() {
		for _, event := range s.Events {
			if streaming.EventMatches(event, matcher) {
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
		if streaming.GetStreamFromEvent(event) == stream {
			count++
		}
	}

	return count
}
