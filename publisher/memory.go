package publisher

import cloudevents "github.com/cloudevents/sdk-go"

type InMemoryPublisher struct {
	Events []cloudevents.Event
}

func NewInMemoryPublisher() *InMemoryPublisher {
	return &InMemoryPublisher{
		Events: make([]cloudevents.Event, 0),
	}
}

func (p *InMemoryPublisher) Publish(event cloudevents.Event) error {
	p.Events = append(p.Events, event)

	return nil
}
