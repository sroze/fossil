package streaming

import (
	"context"
	cloudevents "github.com/cloudevents/sdk-go"
)

type EventStreamFactory struct {
	Source chan cloudevents.Event
	broadcaster *ChannelBroadcaster
}

func NewEventStreamFactory() *EventStreamFactory {
	broadcaster := NewChannelBroadcaster(10)

	return &EventStreamFactory{
		Source: broadcaster.Source,
		broadcaster: broadcaster,
	}
}

func (f *EventStreamFactory) NewEventStream(ctx context.Context, matcher string) chan cloudevents.Event {
	subscription := f.broadcaster.NewSubscriber()
	channel := make(chan cloudevents.Event)

	// Make sure to cancel the subscription when the client finished
	go func() {
		<-ctx.Done()

		f.broadcaster.RemoveSubscriber(subscription)
	}()

	// TODO: Load past events to `channel` first.
	// 		 (or up to the given "last event ID")

	go func() {
		for event := range subscription {
			channel <- event
		}

		f.broadcaster.RemoveSubscriber(subscription)
	}()

	return channel
}
