package simplestore

import (
	"context"
	"github.com/apple/foundationdb/bindings/go/src/fdb"
	"github.com/google/uuid"
	"github.com/sroze/fossil/kv/foundationdb"
	"github.com/stretchr/testify/assert"
	"testing"
)

func Test_Read(t *testing.T) {
	fdb.MustAPIVersion(720)
	s := NewStore(
		foundationdb.NewStore(fdb.MustOpenDatabase("../fdb.cluster")),
		uuid.NewString(),
	)

	stream := "Foo/" + uuid.NewString()
	writeRequests := GenerateStreamWriteRequests(stream, 20)
	_, err := s.Write(writeRequests)
	assert.Nil(t, err)

	dummyEventIds := make([]string, len(writeRequests))
	for i := 0; i < len(writeRequests); i++ {
		dummyEventIds[i] = writeRequests[i].Events[0].EventId
	}

	t.Run("stream all events and closes the stream at the end", func(t *testing.T) {
		ch := make(chan ReadItem)
		go s.Read(context.Background(), stream, 0, ch)

		// Expects all the events to be streamed.
		i := 0
		for item := range ch {
			assert.Nil(t, item.Error)

			if item.EventInStream != nil {
				assert.Equal(t, dummyEventIds[i], item.EventInStream.Event.EventId)
				i++
			}
		}

		assert.Equal(t, len(dummyEventIds), i)
	})

	t.Run("list events from a given position", func(t *testing.T) {
		assert.Greater(t, len(dummyEventIds), 5)

		ch := make(chan ReadItem)
		go s.Read(context.Background(), stream, 4, ch)

		// Expects all the events to be streamed.
		expectedEvents := dummyEventIds[4:]
		for i := 0; i < len(expectedEvents); i++ {
			item := <-ch

			assert.Nil(t, item.Error)

			if item.EventInStream != nil {
				assert.Equal(t, expectedEvents[i], item.EventInStream.Event.EventId)
			}
		}

		// Expects the stream to be closed.
		_, more := <-ch
		assert.False(t, more)
	})

	t.Run("it can read stream straight after write", func(t *testing.T) {
		streamName := "Foo/" + uuid.NewString()
		eventId := uuid.NewString()
		r, err := s.Write([]AppendToStream{{
			Stream: streamName,
			Events: []Event{{
				EventId:   eventId,
				EventType: "SomeThing",
				Payload:   []byte("{\"foo\": 123}"),
			}},
		}})
		assert.Nil(t, err)
		assert.Equal(t, int64(0), r[0].Position)

		ch := make(chan ReadItem)
		go s.Read(context.Background(), streamName, 0, ch)

		item := <-ch
		assert.Nil(t, item.Error)
		assert.Equal(t, eventId, item.EventInStream.Event.EventId)
	})

	t.Skip("returns an error when stream does not exist")
}
