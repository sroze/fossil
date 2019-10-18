package streaming

import (
	"context"
	"github.com/gobwas/glob"
	cloudevents "github.com/cloudevents/sdk-go"
)

var StreamExtensionName = "fossilStream"

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
		close(channel)
	}()

	// TODO: Load past events to `channel` first.
	// 		 (or up to the given "last event ID")

	go func() {
		for event := range subscription {
			stream, ok := event.Extensions()[StreamExtensionName].(string)
			if ok && !streamMatches(stream, matcher) {
				continue
			}

			channel <- event
		}

		f.broadcaster.RemoveSubscriber(subscription)
	}()

	return channel
}

func streamMatches(stream string, matcher string) bool {
	return glob.MustCompile(matcher).Match(stream)
}
