package eskit

import (
	"github.com/google/uuid"
	"github.com/sroze/fossil/store/api/streamstore"
	"github.com/sroze/fossil/store/eskit/codec"
	"github.com/stretchr/testify/assert"
	"testing"
)

type TestState struct {
	A string
}

type EventA struct {
	A string
}

func TestActor_WaitForPosition(t *testing.T) {
	store := NewInMemoryStore()
	stream := "test" + uuid.NewString()
	c := codec.NewGobCodec(EventA{})

	// Populate a stream with events
	event1, err := c.Serialize(EventA{A: "foo"})
	assert.Nil(t, err)

	_, err = store.Write([]streamstore.AppendToStream{
		{Stream: stream, Events: []streamstore.Event{event1}},
	})
	assert.Nil(t, err)

	// Create an actor
	actor := NewActor(
		store,
		c,
		stream,
		TestState{},
		func(state TestState, event interface{}) TestState {
			switch event.(type) {
			case *EventA:
				state.A = event.(*EventA).A
			}

			return state
		},
	)

	// Start the actor
	err = actor.Start()
	assert.Nil(t, err)
	defer actor.Stop()

	t.Run("has updated its state when readyWg", func(t *testing.T) {
		actor.WaitReady()

		assert.Equal(t, "foo", actor.State.A)
	})

	t.Run("wait for a future position", func(t *testing.T) {
		events := make(chan string, 10)

		go func() {
			actor.WaitForPosition(2)
			events <- "wait-finished"
		}()

		go func() {
			err := actor.Write(EventA{A: "bar"}, 1)
			assert.Nil(t, err)
		}()

		assert.Equal(t, "wait-finished", <-events)
		assert.Equal(t, "bar", actor.State.A)
	})

	t.Run("wait for the current position", func(t *testing.T) {
		actor.WaitForPosition(1)
	})

	t.Run("wait for an early position", func(t *testing.T) {
		actor.WaitForPosition(0)
	})
}
