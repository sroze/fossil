package store

import (
	"context"
	cloudevents "github.com/cloudevents/sdk-go"
	"github.com/sroze/fossil/events"
	fossiltesting "github.com/sroze/fossil/testing"
	"testing"
)

func ExpectChannelToBeClosed(t *testing.T, channel chan cloudevents.Event) {
	_, ok := <-channel
	if ok {
		t.Errorf("Expected not to be able to get anything from the stream")
	}
}

func TestEventStream(t *testing.T) {
	t.Run("it finishes the stream when the context finishes", func(t *testing.T) {
		factory := NewEventStreamFactory(NewInMemoryStorage())

		go func() {
			factory.Source <- fossiltesting.NewEvent("1234", "a-stream", 1, 1)
		}()

		ctx, stop := context.WithCancel(context.Background())

		channel := factory.NewEventStream(ctx, events.Matcher{
			UriTemplate: "a-stream",
		})

		fossiltesting.ExpectEventWithId(t, <-channel, "1234")

		stop()

		ExpectChannelToBeClosed(t, channel)
	})

	t.Run("it only returns matching streams", func(t *testing.T) {
		factory := NewEventStreamFactory(NewInMemoryStorage())

		ctx, stop := context.WithCancel(context.Background())
		defer stop()

		channel := factory.NewEventStream(ctx, events.Matcher{
			UriTemplate: "visits/*",
		})

		go func() {
			factory.Source <- fossiltesting.NewEvent("4afa1588-f1ef-11e9-8ef4-c7e0ad27bf29", "visits/352516cb-f5d1-4a37-8cb3-cbb052fd9e16", 1, 1)
			factory.Source <- fossiltesting.NewEvent("5485ea82-f1ef-11e9-982b-17c5c1d05757", "care-recipients/352516cb-f5d1-4a37-8cb3-cbb052fd9e16", 2, 1)
			factory.Source <- fossiltesting.NewEvent("582b212a-f1ef-11e9-a6ef-eba1b6e878ea", "visits/foo", 3, 1)
		}()

		fossiltesting.ExpectEventWithId(t, <-channel, "4afa1588-f1ef-11e9-8ef4-c7e0ad27bf29")
		fossiltesting.ExpectEventWithId(t, <-channel, "582b212a-f1ef-11e9-a6ef-eba1b6e878ea")
	})

	t.Run("it sends previously matching events before the rest", func(t *testing.T) {
		storage := NewInMemoryStorage()
		factory := NewEventStreamFactory(storage)

		ctx, stop := context.WithCancel(context.Background())
		defer stop()

		e1 := fossiltesting.NewEvent("60f48198-f1ef-11e9-b12b-37c775d1c241", "visits/123", 0, 0)
		err := storage.Store(ctx, "visits/123", &e1)
		if err != nil {
			t.Error(err)
		}
		e2 := fossiltesting.NewEvent("65991e7a-f1ef-11e9-8bd5-732995c20781", "care-recipient/123", 0, 0)
		err = storage.Store(ctx, "care-recipient/123", &e2)
		if err != nil {
			t.Error(err)
		}

		channel := factory.NewEventStream(ctx, events.Matcher{
			UriTemplate: "visits/*",
		})

		go func() {
			factory.Source <- fossiltesting.NewEvent("699667c6-f1ef-11e9-a28c-1f4de34db928", "visits/352516cb-f5d1-4a37-8cb3-cbb052fd9e16", 3, 1)
		}()

		fossiltesting.ExpectEventWithId(t, <-channel, "60f48198-f1ef-11e9-b12b-37c775d1c241")
		fossiltesting.ExpectEventWithId(t, <-channel, "699667c6-f1ef-11e9-a28c-1f4de34db928")
	})

	t.Run("it ignores a duplicated event sent via the subscriber", func(t *testing.T) {
		storage := NewInMemoryStorage()
		factory := NewEventStreamFactory(storage)

		ctx, stop := context.WithCancel(context.Background())
		defer stop()

		e1 := fossiltesting.NewEvent("57151e74-f25a-11e9-bc83-2714f1616a54", "visits/123", 1, 1)
		err := storage.Store(ctx, "visits/123", &e1)
		if err != nil {
			t.Error(err)
		}
		e2 := fossiltesting.NewEvent("a8fa4bf6-f25a-11e9-8f97-532348db0b64", "visits/123", 2, 2)
		err = storage.Store(ctx, "visits/123", &e2)
		if err != nil {
			t.Error(err)
		}

		channel := factory.NewEventStream(ctx, events.Matcher{
			UriTemplate: "visits/*",
		})

		go func() {
			factory.Source <- fossiltesting.NewEvent("a8fa4bf6-f25a-11e9-8f97-532348db0b64", "visits/123", 2, 2)
			factory.Source <- fossiltesting.NewEvent("77ea64a6-f25a-11e9-8936-33f48135463a", "visits/123", 3, 3)
		}()

		fossiltesting.ExpectEventWithId(t, <-channel, "57151e74-f25a-11e9-bc83-2714f1616a54")
		fossiltesting.ExpectEventWithId(t, <-channel, "a8fa4bf6-f25a-11e9-8f97-532348db0b64")
		fossiltesting.ExpectEventWithId(t, <-channel, "77ea64a6-f25a-11e9-8936-33f48135463a")
	})
}