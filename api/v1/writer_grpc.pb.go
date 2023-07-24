// Code generated by protoc-gen-go-grpc. DO NOT EDIT.
// versions:
// - protoc-gen-go-grpc v1.3.0
// - protoc             v4.23.4
// source: api/v1/writer.proto

package v1

import (
	context "context"
	grpc "google.golang.org/grpc"
	codes "google.golang.org/grpc/codes"
	status "google.golang.org/grpc/status"
)

// This is a compile-time assertion to ensure that this generated file
// is compatible with the grpc package it is being compiled against.
// Requires gRPC-Go v1.32.0 or later.
const _ = grpc.SupportPackageIsVersion7

const (
	Writer_SayHello_FullMethodName = "/fossil.Writer/SayHello"
)

// WriterClient is the client API for Writer service.
//
// For semantics around ctx use and closing/ending streaming RPCs, please refer to https://pkg.go.dev/google.golang.org/grpc/?tab=doc#ClientConn.NewStream.
type WriterClient interface {
	SayHello(ctx context.Context, in *HelloRequest, opts ...grpc.CallOption) (*HelloReply, error)
}

type writerClient struct {
	cc grpc.ClientConnInterface
}

func NewWriterClient(cc grpc.ClientConnInterface) WriterClient {
	return &writerClient{cc}
}

func (c *writerClient) SayHello(ctx context.Context, in *HelloRequest, opts ...grpc.CallOption) (*HelloReply, error) {
	out := new(HelloReply)
	err := c.cc.Invoke(ctx, Writer_SayHello_FullMethodName, in, out, opts...)
	if err != nil {
		return nil, err
	}
	return out, nil
}

// WriterServer is the server API for Writer service.
// All implementations must embed UnimplementedWriterServer
// for forward compatibility
type WriterServer interface {
	SayHello(context.Context, *HelloRequest) (*HelloReply, error)
	mustEmbedUnimplementedWriterServer()
}

// UnimplementedWriterServer must be embedded to have forward compatible implementations.
type UnimplementedWriterServer struct {
}

func (UnimplementedWriterServer) SayHello(context.Context, *HelloRequest) (*HelloReply, error) {
	return nil, status.Errorf(codes.Unimplemented, "method SayHello not implemented")
}
func (UnimplementedWriterServer) mustEmbedUnimplementedWriterServer() {}

// UnsafeWriterServer may be embedded to opt out of forward compatibility for this service.
// Use of this interface is not recommended, as added methods to WriterServer will
// result in compilation errors.
type UnsafeWriterServer interface {
	mustEmbedUnimplementedWriterServer()
}

func RegisterWriterServer(s grpc.ServiceRegistrar, srv WriterServer) {
	s.RegisterService(&Writer_ServiceDesc, srv)
}

func _Writer_SayHello_Handler(srv interface{}, ctx context.Context, dec func(interface{}) error, interceptor grpc.UnaryServerInterceptor) (interface{}, error) {
	in := new(HelloRequest)
	if err := dec(in); err != nil {
		return nil, err
	}
	if interceptor == nil {
		return srv.(WriterServer).SayHello(ctx, in)
	}
	info := &grpc.UnaryServerInfo{
		Server:     srv,
		FullMethod: Writer_SayHello_FullMethodName,
	}
	handler := func(ctx context.Context, req interface{}) (interface{}, error) {
		return srv.(WriterServer).SayHello(ctx, req.(*HelloRequest))
	}
	return interceptor(ctx, in, info, handler)
}

// Writer_ServiceDesc is the grpc.ServiceDesc for Writer service.
// It's only intended for direct use with grpc.RegisterService,
// and not to be introspected or modified (even as a copy)
var Writer_ServiceDesc = grpc.ServiceDesc{
	ServiceName: "fossil.Writer",
	HandlerType: (*WriterServer)(nil),
	Methods: []grpc.MethodDesc{
		{
			MethodName: "SayHello",
			Handler:    _Writer_SayHello_Handler,
		},
	},
	Streams:  []grpc.StreamDesc{},
	Metadata: "api/v1/writer.proto",
}
