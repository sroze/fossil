package api

import (
	"context"
	"github.com/apple/foundationdb/bindings/go/src/fdb"
	"github.com/google/uuid"
	v1 "github.com/sroze/fossil/store/api/v1"
	"github.com/stretchr/testify/assert"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	"log"
	"testing"
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
