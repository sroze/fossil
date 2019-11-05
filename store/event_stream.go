package store

import (
	"context"
	cloudevents "github.com/cloudevents/sdk-go"
	"github.com/sirupsen/logrus"
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
	l := logrus.WithFields(logrus.Fields{
		"matcher": matcher,
	})

	subscription := f.Broadcaster.NewSubscriber()
	channel := make(chan cloudevents.Event)

	// Make sure to cancel the subscription when the client finished
	go func() {
		<-ctx.Done()

		f.Broadcaster.RemoveSubscriber(subscription)
	}()

	go func() {
		var lastEventNumberReceived = 0

		l.Info("loading previously stored events")
		existingEvents := f.loader.MatchingStream(ctx, matcher)
		for event := range existingEvents {
			channel <- event

			lastEventNumberReceived = events.GetEventNumber(event)
		}

		l.Info("broadcasting newly collected events")
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
