package server

import (
	"github.com/apple/foundationdb/bindings/go/src/fdb"
	v1 "github.com/sroze/fossil/api/v1"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	"log"
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
