package server

import (
	"github.com/apple/foundationdb/bindings/go/src/fdb"
	"github.com/google/uuid"
	v1 "github.com/sroze/fossil/api/v1"
	"github.com/sroze/fossil/kv/foundationdb"
	"github.com/sroze/fossil/store"
	"github.com/sroze/fossil/store/segments"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	"log"
)

func testClient() (v1.WriterClient, func() error) {
	fdb.MustAPIVersion(720)
	kv := foundationdb.NewStore(fdb.MustOpenDatabase("../../fdb.cluster"))
	s := store.NewStore(kv, uuid.New())
	err := s.Start()
	if err != nil {
		log.Fatalf("fail to start store: %v", err)
	}

	// Create a segment that covers everything.
	_, err = s.GetTopologyManager().Create(segments.NewSegment(
		segments.NewPrefixRange(""),
	))
	if err != nil {
		log.Fatalf("fail to create segment: %v", err)
	}

	err, server, a := NewServer(s, 0)

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
		server.Stop()

		return err
	}
}
