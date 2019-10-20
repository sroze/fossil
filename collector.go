package fossil

import (
	"context"
	"fmt"
	cloudevents "github.com/cloudevents/sdk-go"
)

type Collector interface {
	Collect(context context.Context, event *cloudevents.Event) error
}

type DefaultCollector struct {
	store     EventStore
	publisher Publisher
}

func NewCollector(store EventStore, publisher Publisher) *DefaultCollector {
	return &DefaultCollector{
		store,
		publisher,
	}
}

func (c *DefaultCollector) Collect(context context.Context, event *cloudevents.Event) error {
	// Store the event in its streams
	stream, ok := event.Extensions()[StreamExtensionName].(string)
	if !ok {
		return fmt.Errorf("no stream associated to the event")
	}

	// Store the message
	err := c.store.Store(context, stream, event)
	if err != nil {
		return err
	}

	// Publish the message
	err = c.publisher.Publish(context, stream, event)
	if err != nil {
		return err
	}

	return nil
}
