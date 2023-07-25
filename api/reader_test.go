package api

import (
	"context"
	"github.com/google/uuid"
	v1 "github.com/sroze/fossil/store/api/v1"
	"github.com/stretchr/testify/assert"
	"io"
	"testing"
)

// FillStreamWithDummyEvents fills a stream with dummy events.
// It returns the list of event IDs.
func FillStreamWithDummyEvents(c v1.WriterClient, stream string, count int) ([]string, error) {
	var eventIds = make([]string, count)
	for i := 0; i < count; i++ {
		eventIds[i] = uuid.New().String()
		_, err := c.AppendEvent(context.Background(), &v1.AppendRequest{
			StreamName: stream,
			EventId:    eventIds[i],
			EventType:  "AnEventType",
			Payload:    []byte("{\"foo\": 123}"),
		})

		if err != nil {
			return eventIds, err
		}
	}

	return eventIds, nil
}

func Test_reader(t *testing.T) {
	c, end := testClient()
	defer end()

	stream := "Foo/" + uuid.NewString()
	dummyEventIds, err := FillStreamWithDummyEvents(c, stream, 20)
	assert.Nil(t, err)

	t.Run("stream all events and closes the stream at the end", func(t *testing.T) {
		stream, err := c.ReadStream(context.Background(), &v1.ReadStreamRequest{
			StreamName: stream,
		})
		assert.Nil(t, err)

		// Expects all the events to be streamed.
		for i := 0; i < len(dummyEventIds); i++ {
			response, err := stream.Recv()
			assert.Nil(t, err)
			assert.Equal(t, dummyEventIds[i], response.EventId)
		}

		// Expects the stream to be closed.
		_, err = stream.Recv()
		assert.Equal(t, io.EOF, err)
	})

	t.Skip("list events from a given position")
	t.Skip("returns an error when stream does not exist")
}
