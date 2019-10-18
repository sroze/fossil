package in_memory

import (
	"context"
	cloudevents "github.com/cloudevents/sdk-go"
)

type InMemoryPublisher struct {
	Events []cloudevents.Event
}

func NewInMemoryPublisher() *InMemoryPublisher {
	return &InMemoryPublisher{
		Events: make([]cloudevents.Event, 0),
	}
}

func (p *InMemoryPublisher) Publish(ctx context.Context, stream string, event cloudevents.Event) error {
	p.Events = append(p.Events, event)

	return nil
}
