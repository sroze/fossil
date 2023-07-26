package api

import (
	"context"
	"github.com/google/uuid"
	v1 "github.com/sroze/fossil/store/api/v1"
	"github.com/stretchr/testify/assert"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"testing"
)

func Test_writer(t *testing.T) {
	c, end := testClient()
	defer end()

	t.Run("it increments stream position by default", func(t *testing.T) {
		stream := "Foo/" + uuid.NewString()

		response, err := c.AppendEvent(context.Background(), &v1.AppendRequest{
			StreamName: stream,
			EventId:    uuid.New().String(),
			EventType:  "AnEventType",
			Payload:    []byte("{\"foo\": 123}"),
		})
		assert.Nil(t, err)
		assert.Equal(t, uint64(1), response.StreamPosition)

		response, err = c.AppendEvent(context.Background(), &v1.AppendRequest{
			StreamName: stream,
			EventId:    uuid.New().String(),
			EventType:  "AnEventType",
			Payload:    []byte("{\"foo\": 123}"),
		})
		assert.Nil(t, err)
		assert.Equal(t, uint64(2), response.StreamPosition)
	})

	t.Run("expects the write stream position", func(t *testing.T) {
		t.Run("successfully expects an empty stream then fails expecting it to be empty", func(t *testing.T) {
			emptyStreamPosition := uint64(0)
			stream := "Foo/" + uuid.NewString()

			_, err := c.AppendEvent(context.Background(), &v1.AppendRequest{
				StreamName:       stream,
				EventId:          uuid.New().String(),
				EventType:        "AnEventType",
				Payload:          []byte("{\"foo\": 123}"),
				ExpectedPosition: &emptyStreamPosition,
			})
			assert.Nil(t, err)

			_, err = c.AppendEvent(context.Background(), &v1.AppendRequest{
				StreamName:       stream,
				EventId:          uuid.New().String(),
				EventType:        "AnEventType",
				Payload:          []byte("{\"foo\": 123}"),
				ExpectedPosition: &emptyStreamPosition,
			})

			assert.NotNil(t, err)
			if e, ok := status.FromError(err); ok {
				assert.Equal(t, codes.FailedPrecondition, e.Code())
			} else {
				assert.Fail(t, "expected a status error")
			}
		})

		t.Run("expects a specific stream version", func(t *testing.T) {
			stream := "Foo/" + uuid.NewString()
			_, err := FillStreamWithDummyEvents(c, stream, 20)
			assert.Nil(t, err)

			// Writes an event at the expected position.
			expectedVersion := uint64(20)
			_, err = c.AppendEvent(context.Background(), &v1.AppendRequest{
				StreamName:       stream,
				EventId:          uuid.New().String(),
				EventType:        "AnEventType",
				Payload:          []byte("{\"foo\": 123}"),
				ExpectedPosition: &expectedVersion,
			})

			assert.Nil(t, err)

			// Fails to write an event at the expected position.
			_, err = c.AppendEvent(context.Background(), &v1.AppendRequest{
				StreamName:       stream,
				EventId:          uuid.New().String(),
				EventType:        "AnEventType",
				Payload:          []byte("{\"foo\": 123}"),
				ExpectedPosition: &expectedVersion,
			})

			assert.NotNil(t, err)
		})
	})

	t.Run("only one of multiple concurrent writes succeeds", func(t *testing.T) {
		emptyStreamPosition := uint64(0)
		stream := "Foo/" + uuid.NewString()

		numberOfConcurrentRequests := 5
		resultChan := make(chan error, numberOfConcurrentRequests)

		for i := 0; i < numberOfConcurrentRequests; i++ {
			go func() {
				_, err := c.AppendEvent(context.Background(), &v1.AppendRequest{
					StreamName:       stream,
					EventId:          uuid.New().String(),
					EventType:        "AnEventType",
					Payload:          []byte("{\"foo\": 123}"),
					ExpectedPosition: &emptyStreamPosition,
				})

				resultChan <- err
			}()
		}

		numberOfSuccesses := 0
		numberOfFailures := 0
		for i := 0; i < numberOfConcurrentRequests; i++ {
			err := <-resultChan

			if err != nil {
				numberOfFailures++
			} else {
				numberOfSuccesses++
			}
		}

		assert.Equal(t, 1, numberOfSuccesses)
		assert.Equal(t, numberOfConcurrentRequests-1, numberOfFailures)
	})
}

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
