package streamstore

import (
	"context"
	"github.com/apple/foundationdb/bindings/go/src/fdb"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"testing"
)

func Test_WaitForEvent(t *testing.T) {
	fdb.MustAPIVersion(720)
	ss := NewFoundationStore(fdb.MustOpenDatabase("../../fdb.cluster"))

	t.Run("waits an empty stream", func(t *testing.T) {
		stream := "Foo/" + uuid.NewString()

		ctx, cancel := context.WithCancel(context.Background())
		defer cancel()

		// Start watching the stream.
		ch := make(chan error)
		go func() {
			ch <- ss.WaitForEvent(ctx, stream, 0)
		}()

		// Write an event to the stream.
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
		assert.Nil(t, <-ch)
	})
}
