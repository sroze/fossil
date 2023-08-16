package eskit

import (
	"context"
	"github.com/google/uuid"
	"github.com/sroze/fossil/simplestore"
	"github.com/stretchr/testify/assert"
	"testing"
)

func Test_InMemoryStore(t *testing.T) {
	s := NewInMemoryStore()

	t.Run("write & read from a stream", func(t *testing.T) {
		stream := "test" + uuid.NewString()

		eventId := uuid.NewString()
		result, err := s.Write([]simplestore.AppendToStream{
			{Stream: stream, Events: []simplestore.Event{
				{EventId: eventId, EventType: "Foo", Payload: []byte("bar")},
			}},
		})
		assert.Nil(t, err)
		assert.Equal(t, 1, len(result))
		assert.Equal(t, int64(0), result[0].Position)

		ch := make(chan simplestore.ReadItem)
		go s.Read(context.Background(), stream, 0, ch)

		item := <-ch
		assert.Equal(t, eventId, item.EventInStream.Event.EventId)

		// Expect the end of stream signal.
		item, more := <-ch
		assert.False(t, more)
		assert.Nil(t, item.EventInStream)
		assert.Nil(t, item.Error)
		assert.Nil(t, item.EndOfStreamSignal)
	})

	t.Run("conflict on writes", func(t *testing.T) {
		stream := "test" + uuid.NewString()

		position := int64(0)
		_, err := s.Write([]simplestore.AppendToStream{
			{Stream: stream, Events: []simplestore.Event{
				{EventId: uuid.NewString(), EventType: "Foo", Payload: []byte("foo")},
			}, ExpectedPosition: &position},
		})
		assert.NotNil(t, err)

		position = int64(-1)
		_, err = s.Write([]simplestore.AppendToStream{
			{Stream: stream, Events: []simplestore.Event{
				{EventId: uuid.NewString(), EventType: "Bar", Payload: []byte("bar")},
			}, ExpectedPosition: &position},
		})
		assert.Nil(t, err)

		position = int64(0)
		_, err = s.Write([]simplestore.AppendToStream{
			{Stream: stream, Events: []simplestore.Event{
				{EventId: uuid.NewString(), EventType: "Baz", Payload: []byte("baz")},
			}, ExpectedPosition: &position},
		})
		assert.Nil(t, err)
	})
}
