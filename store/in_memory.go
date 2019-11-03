package store

import (
	"context"
	cloudevents "github.com/cloudevents/sdk-go"
	"github.com/sroze/fossil/events"
)

type InMemoryPublisher struct {
	Events []*cloudevents.Event
}

func NewInMemoryPublisher() *InMemoryPublisher {
	return &InMemoryPublisher{
		Events: make([]*cloudevents.Event, 0),
	}
}

func (p *InMemoryPublisher) Publish(ctx context.Context, stream string, event *cloudevents.Event) error {
	p.Events = append(p.Events, event)

	return nil
}

type InMemoryStorage struct {
	Events []cloudevents.Event
}

func NewInMemoryStorage() *InMemoryStorage {
	return &InMemoryStorage{
		Events: make([]cloudevents.Event, 0),
	}
}

func (s *InMemoryStorage) Find(ctx context.Context, identifier string) (*cloudevents.Event, error) {
	for _, e := range s.Events {
		if e.ID() == identifier {
			return &e, nil
		}
	}

	return nil, &EventNotFound{}
}

func (s *InMemoryStorage) Store(ctx context.Context, stream string, event *cloudevents.Event) error {
	err := s.addOrReplace(*event)
	if err != nil {
		return err
	}

	events.SetStream(event, stream)
	events.SetEventNumber(event, len(s.Events))
	events.SetSequenceNumberInStream(event, s.countEventsInStream(stream))

	return nil
}

func (s *InMemoryStorage) addOrReplace(event cloudevents.Event) error {
	for index, e := range s.Events {
		if e.ID() == event.ID() {
			if events.IsReplacingAnotherEvent(event) {
				s.Events[index] = event

				return nil
			}

			return NewDuplicateEventError(e)
		}
	}

	expectedNumber := events.GetExpectedSequenceNumber(event)
	if expectedNumber > 0 && (len(s.Events)+1) != expectedNumber {
		return &SequenceNumberDoNotMatchError{}
	}

	s.Events = append(s.Events, event)

	return nil
}

func (s *InMemoryStorage) MatchingStream(ctx context.Context, matcher events.Matcher) chan cloudevents.Event {
	c := make(chan cloudevents.Event)

	go func() {
		for _, event := range s.Events {
			if events.EventMatches(event, matcher) {
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
		if events.GetStreamFromEvent(event) == stream {
			count++
		}
	}

	return count
}
