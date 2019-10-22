package fossil

import (
	"context"
	cloudevents "github.com/cloudevents/sdk-go"
	"github.com/sroze/fossil/collector"
	"github.com/sroze/fossil/streaming"
)

type DefaultCollector struct {
	store     collector.EventStore
	publisher collector.Publisher
}

func NewCollector(store collector.EventStore, publisher collector.Publisher) *DefaultCollector {
	return &DefaultCollector{
		store,
		publisher,
	}
}

func (c *DefaultCollector) Collect(context context.Context, event *cloudevents.Event) error {
	// Store the event in its streams
	stream := streaming.GetStreamFromEvent(*event)

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
