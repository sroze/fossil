package store

import (
	"context"
	cloudevents "github.com/cloudevents/sdk-go"
	"github.com/sroze/fossil/concurrency"
	"github.com/sroze/fossil/events"
)

type EventStreamFactory struct {
	Source      chan cloudevents.Event
	Broadcaster *concurrency.ChannelBroadcaster
	loader      EventLoader
}

func NewEventStreamFactory(loader EventLoader) *EventStreamFactory {
	broadcaster := concurrency.NewChannelBroadcaster(10)

	return &EventStreamFactory{
		Source:      broadcaster.Source,
		Broadcaster: broadcaster,
		loader:      loader,
	}
}

func (f *EventStreamFactory) NewEventStream(ctx context.Context, matcher events.Matcher) chan cloudevents.Event {
	subscription := f.Broadcaster.NewSubscriber()
	channel := make(chan cloudevents.Event)

	// Make sure to cancel the subscription when the client finished
	go func() {
		<-ctx.Done()

		f.Broadcaster.RemoveSubscriber(subscription)
	}()

	existingEvents := f.loader.MatchingStream(ctx, matcher)
	go func() {
		var lastEventNumberReceived = 0

		for event := range existingEvents {
			channel <- event

			lastEventNumberReceived = events.GetEventNumber(event)
		}

		for event := range subscription {
			if !events.EventMatches(event, matcher) {
				continue
			}

			// Ignore already sent events
			if lastEventNumberReceived >= events.GetEventNumber(event) {
				continue
			}

			channel <- event
		}

		f.Broadcaster.RemoveSubscriber(subscription)
		close(channel)
	}()

	return channel
}
