package server

import (
	"fmt"
	"github.com/apple/foundationdb/bindings/go/src/fdb"
	v1 "github.com/sroze/fossil/api/v1"
	"github.com/sroze/fossil/simplestore"
	"google.golang.org/grpc"
	"log"
	"net"
)

type Server struct {
	streamStore *simplestore.SimpleStore

	v1.UnimplementedWriterServer
}

func NewServer(db fdb.Database, port int) (error, *grpc.Server, *net.TCPAddr) {
	lis, err := net.Listen("tcp", fmt.Sprintf("127.0.0.1:%d", port))
	if err != nil {
		return err, nil, nil
	}

	addr := lis.Addr().(*net.TCPAddr)
	s := grpc.NewServer()
	ss := simplestore.NewStore(db)
	v1.RegisterWriterServer(s, &Server{
		streamStore: ss,
	})

	// Start the GRPC API in the background.
	go func() {
		log.Printf("server listening at %v", addr)
		if err := s.Serve(lis); err != nil {
			log.Fatalf("failed to serve: %v", err)
		}
	}()

	return nil, s, addr
}
