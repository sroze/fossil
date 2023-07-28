package api

import (
	"fmt"
	"github.com/apple/foundationdb/bindings/go/src/fdb"
	"github.com/sroze/fossil/store/api/index"
	"github.com/sroze/fossil/store/api/store"
	v1 "github.com/sroze/fossil/store/api/v1"
	"google.golang.org/grpc"
	"log"
	"net"
)

type Server struct {
	db    *fdb.Database
	lm    *index.IndexManager
	store *store.FoundationDBStore

	v1.UnimplementedWriterServer
}

func NewServer(db fdb.Database, port int) (error, *grpc.Server, *net.TCPAddr) {
	lis, err := net.Listen("tcp", fmt.Sprintf("127.0.0.1:%d", port))
	if err != nil {
		return err, nil, nil
	}

	addr := lis.Addr().(*net.TCPAddr)
	s := grpc.NewServer()
	v1.RegisterWriterServer(s, &Server{
		db:    &db,
		store: store.NewStore(db),
		lm:    index.NewManager(db),
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
