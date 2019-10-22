package streaming

import (
	"context"
	cloudevents "github.com/cloudevents/sdk-go"
	"github.com/sroze/fossil/collector"
)

type EventStreamFactory struct {
	Source      chan cloudevents.Event
	broadcaster *ChannelBroadcaster
	loader      collector.EventLoader
}

func NewEventStreamFactory(loader collector.EventLoader) *EventStreamFactory {
	broadcaster := NewChannelBroadcaster(10)

	return &EventStreamFactory{
		Source:      broadcaster.Source,
		broadcaster: broadcaster,
		loader:      loader,
	}
}

func (f *EventStreamFactory) NewEventStream(ctx context.Context, matcher collector.Matcher) chan cloudevents.Event {
	subscription := f.broadcaster.NewSubscriber()
	channel := make(chan cloudevents.Event)

	// Make sure to cancel the subscription when the client finished
	go func() {
		<-ctx.Done()

		f.broadcaster.RemoveSubscriber(subscription)
		close(channel)
	}()

	existingEvents := f.loader.MatchingStream(ctx, matcher)
	go func() {
		var lastEventNumberReceived = 0

		for event := range existingEvents {
			channel <- event

			lastEventNumberReceived = GetEventNumber(event)
		}

		for event := range subscription {
			if !EventMatches(event, matcher) {
				continue
			}

			// Ignore already sent events
			if lastEventNumberReceived >= GetEventNumber(event) {
				continue
			}

			channel <- event
		}

		f.broadcaster.RemoveSubscriber(subscription)
	}()

	return channel
}
