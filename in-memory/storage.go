package in_memory

import (
	"context"
	cloudevents "github.com/cloudevents/sdk-go"
)

type EventInStream struct {
	event cloudevents.Event
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

func (s *InMemoryStorage) Store(ctx context.Context, stream string, event cloudevents.Event) error {
	s.Events = append(s.Events, EventInStream{event, stream })

	return nil
}
