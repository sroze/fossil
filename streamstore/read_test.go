package streamstore

import (
	"context"
	"github.com/apple/foundationdb/bindings/go/src/fdb"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"testing"
)

func Test_ReadAndFollow(t *testing.T) {
	fdb.MustAPIVersion(720)
	ss := NewFoundationStore(fdb.MustOpenDatabase("../../fdb.cluster"))

	t.Run("sends a message when end-of-stream is being hit", func(t *testing.T) {
		stream := "Foo/" + uuid.NewString()

		// Add one event to the stream.
		_, err := ss.Write([]AppendToStream{
			{
				Stream: stream,
				Events: []Event{
					{
						EventId:   uuid.NewString(),
						EventType: "Foo",
						Payload:   []byte(""),
					},
				},
			},
		})
		assert.Nil(t, err)

		ch := make(chan ReadItem, 10)

		ctx, cancel := context.WithCancel(context.Background())
		go ss.ReadAndFollow(ctx, stream, 0, ch)

		// Expects the first event to be streamed.
		item := <-ch
		assert.NotNil(t, item.EventInStream)
		assert.Equal(t, uint64(1), item.EventInStream.Position)
		assert.Equal(t, "Foo", item.EventInStream.Event.EventType)

		// Expects the end-of-stream to be notified.
		item = <-ch
		assert.NotNil(t, item.EndOfStreamSignal)
		assert.Equal(t, uint64(1), item.EndOfStreamSignal.StreamPosition)

		// Add another event, it should still continue follwing the stream.
		_, err = ss.Write([]AppendToStream{
			{
				Stream: stream,
				Events: []Event{
					{
						EventId:   uuid.NewString(),
						EventType: "Bar",
						Payload:   []byte(""),
					},
				},
			},
		})
		assert.Nil(t, err)

		// Expects the second event to be streamed.
		item = <-ch
		assert.NotNil(t, item.EventInStream)
		assert.Equal(t, uint64(2), item.EventInStream.Position)
		assert.Equal(t, "Bar", item.EventInStream.Event.EventType)

		// Expects a second end-of-stream event.
		item = <-ch
		assert.NotNil(t, item.EndOfStreamSignal)
		assert.Equal(t, uint64(2), item.EndOfStreamSignal.StreamPosition)

		// Cancel the context to stop.
		cancel()

		// Expects the stream to be closed.
		_, ok := <-ch
		assert.False(t, ok)
	})
}
