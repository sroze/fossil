package eskit

import (
	"context"
	"github.com/google/uuid"
	streamstore2 "github.com/sroze/fossil/store/streamstore"
	"github.com/stretchr/testify/assert"
	"testing"
)

func Test_InMemoryStore(t *testing.T) {
	s := NewInMemoryStore()

	t.Run("write & stream from a stream", func(t *testing.T) {
		stream := "test" + uuid.NewString()

		result, err := s.Write([]streamstore2.AppendToStream{
			{Stream: stream, Events: []streamstore2.Event{
				{EventId: uuid.NewString(), EventType: "Foo", Payload: []byte("bar")},
			}},
		})
		assert.Nil(t, err)
		assert.Equal(t, 1, len(result))
		assert.Equal(t, uint64(0), result[0].Position)
	})

	t.Run("read & follow on an empty stream", func(t *testing.T) {
		stream := "test" + uuid.NewString()

		ctx, cancel := context.WithCancel(context.Background())
		defer cancel()

		ch := make(chan streamstore2.ReadItem)
		go s.ReadAndFollow(ctx, stream, 0, ch)
		item := <-ch
		assert.NotNil(t, item.EndOfStreamSignal)
		assert.Equal(t, uint64(0), item.EndOfStreamSignal.StreamPosition)

		_, err := s.Write([]streamstore2.AppendToStream{
			{Stream: stream, Events: []streamstore2.Event{
				{EventId: uuid.NewString(), EventType: "Foo", Payload: []byte("foo")},
				{EventId: uuid.NewString(), EventType: "Bar", Payload: []byte("bar")},
			}},
		})
		assert.Nil(t, err)

		item = <-ch
		assert.NotNil(t, item.EventInStream)
		assert.Equal(t, uint64(0), item.EventInStream.Position)
		assert.Equal(t, "Foo", item.EventInStream.Event.EventType)

		item = <-ch
		assert.NotNil(t, item.EventInStream)
		assert.Equal(t, uint64(1), item.EventInStream.Position)
		assert.Equal(t, "Bar", item.EventInStream.Event.EventType)
	})

	t.Run("read & follow on a existing stream", func(t *testing.T) {
		stream := "test" + uuid.NewString()

		_, err := s.Write([]streamstore2.AppendToStream{
			{Stream: stream, Events: []streamstore2.Event{
				{EventId: uuid.NewString(), EventType: "Foo", Payload: []byte("bar")},
			}},
		})
		assert.Nil(t, err)

		ctx, cancel := context.WithCancel(context.Background())
		defer cancel()

		ch := make(chan streamstore2.ReadItem)
		go s.ReadAndFollow(ctx, stream, 0, ch)
		item := <-ch
		assert.NotNil(t, item.EventInStream)
		assert.Equal(t, uint64(0), item.EventInStream.Position)
		assert.Equal(t, "Foo", item.EventInStream.Event.EventType)

		item = <-ch
		assert.NotNil(t, item.EndOfStreamSignal)
		assert.Equal(t, uint64(1), item.EndOfStreamSignal.StreamPosition)

		_, err = s.Write([]streamstore2.AppendToStream{
			{Stream: stream, Events: []streamstore2.Event{
				{EventId: uuid.NewString(), EventType: "Bar", Payload: []byte("baz")},
			}},
		})
		assert.Nil(t, err)

		item = <-ch
		assert.NotNil(t, item.EventInStream)
		assert.Equal(t, uint64(1), item.EventInStream.Position)
		assert.Equal(t, "Bar", item.EventInStream.Event.EventType)
	})

	t.Run("conflict on writes", func(t *testing.T) {
		stream := "test" + uuid.NewString()

		position := uint64(1)
		_, err := s.Write([]streamstore2.AppendToStream{
			{Stream: stream, Events: []streamstore2.Event{
				{EventId: uuid.NewString(), EventType: "Foo", Payload: []byte("foo")},
			}, ExpectedPosition: &position},
		})
		assert.NotNil(t, err)

		position = uint64(0)
		_, err = s.Write([]streamstore2.AppendToStream{
			{Stream: stream, Events: []streamstore2.Event{
				{EventId: uuid.NewString(), EventType: "Bar", Payload: []byte("bar")},
			}, ExpectedPosition: &position},
		})
		assert.Nil(t, err)

		position = uint64(1)
		_, err = s.Write([]streamstore2.AppendToStream{
			{Stream: stream, Events: []streamstore2.Event{
				{EventId: uuid.NewString(), EventType: "Baz", Payload: []byte("baz")},
			}, ExpectedPosition: &position},
		})
		assert.Nil(t, err)
	})
}
