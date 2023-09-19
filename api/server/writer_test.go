package server

import (
	"context"
	"github.com/google/uuid"
	v1 "github.com/sroze/fossil/api/v1"
	"github.com/stretchr/testify/assert"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"testing"
)

func Test_writer(t *testing.T) {
	c, end := testClient()
	defer end()

	t.Run("errors are translated to gRPC codes", func(t *testing.T) {
		stream := "Foo/" + uuid.NewString()
		_, err := FillStreamWithDummyEvents(c, stream, 20)
		assert.Nil(t, err)

		// Writes an event at the expected position.
		expectedVersion := int64(1)
		_, err = c.Append(context.Background(), &v1.AppendRequest{
			StreamName: stream,
			Events: []*v1.EventToAppend{
				{EventId: uuid.New().String(), EventType: "AnEventType", Payload: []byte("{\"foo\": 123}")},
			},
			ExpectedPosition: &expectedVersion,
		})

		assert.NotNil(t, err)
		if e, ok := status.FromError(err); ok {
			assert.Equal(t, codes.FailedPrecondition, e.Code())
		} else {
			assert.Fail(t, "expected a status error")
		}
	})
}

// FillStreamWithDummyEvents fills a stream with dummy events.
// It returns the list of event IDs.
func FillStreamWithDummyEvents(c v1.WriterClient, stream string, count int) ([]string, error) {
	var eventIds = make([]string, count)
	for i := 0; i < count; i++ {
		eventIds[i] = uuid.New().String()
		_, err := c.Append(context.Background(), &v1.AppendRequest{
			StreamName: stream,
			Events: []*v1.EventToAppend{
				{EventId: eventIds[i], EventType: "AnEventType", Payload: []byte("{\"foo\": 123}")},
			},
		})

		if err != nil {
			return eventIds, err
		}
	}

	return eventIds, nil
}
