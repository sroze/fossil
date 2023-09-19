package server

import (
	"fmt"
	v1 "github.com/sroze/fossil/api/v1"
	"github.com/sroze/fossil/store"
	"google.golang.org/grpc"
	"log"
	"net"
)

type Server struct {
	store *store.Store

	v1.UnimplementedWriterServer
}

func NewServer(store *store.Store, listenPort int) (error, *grpc.Server, *net.TCPAddr) {
	lis, err := net.Listen("tcp", fmt.Sprintf("127.0.0.1:%d", listenPort))
	if err != nil {
		return err, nil, nil
	}

	addr := lis.Addr().(*net.TCPAddr)
	s := grpc.NewServer()
	v1.RegisterWriterServer(s, &Server{
		store: store,
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
