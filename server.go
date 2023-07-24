package main

import (
	"context"
	"log"

	v1 "github.com/sroze/fossil/writer/api/v1"
)

type Server struct {
	v1.UnimplementedWriterServer
}

func (s *Server) SayHello(ctx context.Context, in *v1.HelloRequest) (*v1.HelloReply, error) {
	log.Printf("Received: %v", in.GetName())
	return &v1.HelloReply{Message: "Hello " + in.GetName()}, nil
}
