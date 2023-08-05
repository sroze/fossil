package api

import (
	"context"
	"github.com/apple/foundationdb/bindings/go/src/fdb"
	"github.com/google/uuid"
	v1 "github.com/sroze/fossil/api/v1"
	"github.com/stretchr/testify/assert"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	"io"
	"log"
	"testing"
	"time"
)

func testClient() (v1.WriterClient, func() error) {
	fdb.MustAPIVersion(720)
	err, s, a := NewServer(fdb.MustOpenDatabase("../fdb.cluster"), 0)

	// Create the gRPC client.
	conn, err := grpc.Dial(
		a.String(),
		grpc.WithTransportCredentials(insecure.NewCredentials()),
	)
	if err != nil {
		log.Fatalf("fail to dial: %v", err)
	}
	client := v1.NewWriterClient(conn)

	return client, func() error {
		err := conn.Close()
		s.Stop()

		return err
	}
}

func Test_server(t *testing.T) {
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

	t.Run("list events from a given position", func(t *testing.T) {
		stream, err := c.ReadStream(context.Background(), &v1.ReadStreamRequest{
			StreamName:       stream,
			StartingPosition: 5,
		})
		assert.Nil(t, err)
		assert.Greater(t, len(dummyEventIds), 5)

		// Expects all the events to be streamed.
		expectedEvents := dummyEventIds[4:]
		for i := 0; i < len(expectedEvents); i++ {
			response, err := stream.Recv()

			assert.Nil(t, err)
			assert.Equal(t, expectedEvents[i], response.EventId)
		}

		// Expects the stream to be closed.
		_, err = stream.Recv()
		assert.Equal(t, io.EOF, err)
	})

	t.Run("stream all events and continue to stream from there", func(t *testing.T) {
		anotherStream := "Foo/" + uuid.NewString()
		dummyEventIds, err := FillStreamWithDummyEvents(c, anotherStream, 5)
		assert.Nil(t, err)

		// Start streaming all events.
		ctx, cancel := context.WithCancel(context.Background())
		defer cancel()

		stream, err := c.ReadStream(ctx, &v1.ReadStreamRequest{
			StreamName: anotherStream,
			Subscribe:  true,
		})
		assert.Nil(t, err)

		// Expects all the events to be streamed.
		channel := ReaderAsChannel(stream)
		for i := 0; i < len(dummyEventIds); i++ {
			event := <-channel

			assert.Equal(t, dummyEventIds[i], event.EventId)
		}

		// Expects reading to timeout.
		select {
		case <-channel:
			t.Error("expected stream to be pending instead")
		case <-time.After(100 * time.Millisecond):
			// this is expected, yay!
		}

		// Send an event.
		anotherEventId := uuid.New().String()
		_, err = c.AppendEvent(context.Background(), &v1.AppendRequest{
			StreamName: anotherStream,
			EventId:    anotherEventId,
			EventType:  "AnEventType",
			Payload:    []byte("{\"foo\": 123}"),
		})
		assert.Nil(t, err)

		// Expects the event to be streamed within reasonable timeframes.
		select {
		case event, more := <-channel:
			if !more {
				t.Error("expected stream to be filled instead of being closed")
			} else {
				assert.Equal(t, anotherEventId, event.EventId)
			}
		case <-time.After(1000 * time.Millisecond):
			t.Error("expected stream to be filled instead of receiving timeout")
		}
	})

	t.Run("it can read stream straight after write", func(t *testing.T) {
		streamName := "Foo/" + uuid.NewString()
		request := v1.AppendRequest{
			StreamName: streamName,
			EventId:    uuid.New().String(),
			EventType:  "SomeThing",
			Payload:    []byte("{\"foo\": 123}"),
		}

		r, err := c.AppendEvent(context.Background(), &request)

		assert.Nil(t, err)
		assert.Equal(t, uint64(1), r.StreamPosition)

		stream, err := c.ReadStream(context.Background(), &v1.ReadStreamRequest{
			StreamName: streamName,
		})
		assert.Nil(t, err)

		sumStreamResponse, err := stream.Recv()
		assert.Nil(t, err)
		assert.Equal(t, sumStreamResponse.EventId, request.EventId)
		assert.Equal(t, request.Payload, sumStreamResponse.Payload)
		assert.Equal(t, uint64(1), sumStreamResponse.StreamPosition)
	})
}
