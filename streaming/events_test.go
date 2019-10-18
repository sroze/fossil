package streaming

import (
	"context"
	cloudevents "github.com/cloudevents/sdk-go"
	"testing"
)

func NewEvent(id string, stream string) cloudevents.Event {
	event := cloudevents.NewEvent("0.3")
	event.SetType("type")
	event.SetSource("/my/system")
	event.SetID(id)

	if stream != "" {
		event.SetExtension(StreamExtensionName, stream)
	}

	return event
}

func TestEventStream(t *testing.T) {
	t.Run("it finishes the stream when the context finishes", func(t *testing.T) {
		factory := NewEventStreamFactory()

		go func() {
			factory.Source <- NewEvent("1234", "")
		}()

		ctx, stop := context.WithCancel(context.Background())

		channel := factory.NewEventStream(ctx, "matcher")

		e1 := <- channel
		if e1.ID() != "1234" {
			t.Errorf("expected ID 1234, got %s", e1.ID())
		}

		stop()

		_, ok := <- channel
		if ok {
			t.Errorf("Expected not to be able to get anything from the stream")
		}
	})

	t.Run("it only returns matching streams", func(t *testing.T) {
		factory := NewEventStreamFactory()

		ctx, stop := context.WithCancel(context.Background())
		defer stop()

		channel := factory.NewEventStream(ctx, "visits/*")

		go func() {
			factory.Source <- NewEvent("1", "visits/352516cb-f5d1-4a37-8cb3-cbb052fd9e16")
			factory.Source <- NewEvent("2", "care-recipients/352516cb-f5d1-4a37-8cb3-cbb052fd9e16")
			factory.Source <- NewEvent("3", "visits/foo")
		}()

		e1 := <- channel
		if e1.ID() != "1" {
			t.Errorf("expected event 1, got %s", e1.ID())
		}

		e2 := <- channel
		if e2.ID() != "3" {
			t.Errorf("expected event 3, get %s", e2.ID())
		}
	})
}
