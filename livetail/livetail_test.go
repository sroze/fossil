package livetail

import (
	"github.com/apple/foundationdb/bindings/go/src/fdb"
	"github.com/google/uuid"
	"github.com/sroze/fossil/streamstore"
	"github.com/stretchr/testify/assert"
	"testing"
)

func Test_LiveTail(t *testing.T) {
	fdb.MustAPIVersion(720)
	ss := streamstore.NewSegmentStore(fdb.MustOpenDatabase("../fdb.cluster"))

	t.Run("sends a message when end-of-stream is being hit", func(t *testing.T) {
		stream := "Foo/" + uuid.NewString()

		// Add one event to the stream.
		_, err := ss.Write([]streamstore.AppendToStream{
			{
				Stream: stream,
				Events: []streamstore.Event{
					{
						EventId:   uuid.NewString(),
						EventType: "Foo",
						Payload:   []byte(""),
					},
				},
			},
		})
		assert.Nil(t, err)

		ch := make(chan streamstore.ReadItem, 10)

		subscription := NewLiveTail(
			NewStreamReader(ss, stream),
		)
		go subscription.Start("0", ch)

		// Expects the first event to be streamed.
		item := <-ch
		assert.NotNil(t, item.EventInStream)
		assert.Equal(t, int64(0), item.EventInStream.Position)
		assert.Equal(t, "Foo", item.EventInStream.Event.EventType)

		// Expects the end-of-stream to be notified.
		item = <-ch
		assert.NotNil(t, item.EndOfStreamSignal)
		assert.Equal(t, int64(0), item.EndOfStreamSignal.StreamPosition)

		// Add another event, it should still continue follwing the stream.
		_, err = ss.Write([]streamstore.AppendToStream{
			{
				Stream: stream,
				Events: []streamstore.Event{
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
		assert.Equal(t, int64(1), item.EventInStream.Position)
		assert.Equal(t, "Bar", item.EventInStream.Event.EventType)

		// Expects a second end-of-stream event.
		item = <-ch
		assert.NotNil(t, item.EndOfStreamSignal)
		assert.Equal(t, int64(1), item.EndOfStreamSignal.StreamPosition)

		// Cancel the context to stop.
		subscription.Stop()

		// Expects the stream to be closed.
		_, ok := <-ch
		assert.False(t, ok)
	})
}
