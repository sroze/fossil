// Code generated by protoc-gen-go-grpc. DO NOT EDIT.
// versions:
// - protoc-gen-go-grpc v1.3.0
// - protoc             v4.23.4
// source: api/v1/store.proto

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
	Writer_Append_FullMethodName     = "/fossil.Writer/Append"
	Writer_ReadStream_FullMethodName = "/fossil.Writer/ReadStream"
)

// WriterClient is the client API for Writer service.
//
// For semantics around ctx use and closing/ending streaming RPCs, please refer to https://pkg.go.dev/google.golang.org/grpc/?tab=doc#ClientConn.NewStream.
type WriterClient interface {
	Append(ctx context.Context, in *AppendRequest, opts ...grpc.CallOption) (*AppendReply, error)
	ReadStream(ctx context.Context, in *ReadStreamRequest, opts ...grpc.CallOption) (Writer_ReadStreamClient, error)
}

type writerClient struct {
	cc grpc.ClientConnInterface
}

func NewWriterClient(cc grpc.ClientConnInterface) WriterClient {
	return &writerClient{cc}
}

func (c *writerClient) Append(ctx context.Context, in *AppendRequest, opts ...grpc.CallOption) (*AppendReply, error) {
	out := new(AppendReply)
	err := c.cc.Invoke(ctx, Writer_Append_FullMethodName, in, out, opts...)
	if err != nil {
		return nil, err
	}
	return out, nil
}

func (c *writerClient) ReadStream(ctx context.Context, in *ReadStreamRequest, opts ...grpc.CallOption) (Writer_ReadStreamClient, error) {
	stream, err := c.cc.NewStream(ctx, &Writer_ServiceDesc.Streams[0], Writer_ReadStream_FullMethodName, opts...)
	if err != nil {
		return nil, err
	}
	x := &writerReadStreamClient{stream}
	if err := x.ClientStream.SendMsg(in); err != nil {
		return nil, err
	}
	if err := x.ClientStream.CloseSend(); err != nil {
		return nil, err
	}
	return x, nil
}

type Writer_ReadStreamClient interface {
	Recv() (*ReadStreamReplyItem, error)
	grpc.ClientStream
}

type writerReadStreamClient struct {
	grpc.ClientStream
}

func (x *writerReadStreamClient) Recv() (*ReadStreamReplyItem, error) {
	m := new(ReadStreamReplyItem)
	if err := x.ClientStream.RecvMsg(m); err != nil {
		return nil, err
	}
	return m, nil
}

// WriterServer is the server API for Writer service.
// All implementations must embed UnimplementedWriterServer
// for forward compatibility
type WriterServer interface {
	Append(context.Context, *AppendRequest) (*AppendReply, error)
	ReadStream(*ReadStreamRequest, Writer_ReadStreamServer) error
	mustEmbedUnimplementedWriterServer()
}

// UnimplementedWriterServer must be embedded to have forward compatible implementations.
type UnimplementedWriterServer struct {
}

func (UnimplementedWriterServer) Append(context.Context, *AppendRequest) (*AppendReply, error) {
	return nil, status.Errorf(codes.Unimplemented, "method Append not implemented")
}
func (UnimplementedWriterServer) ReadStream(*ReadStreamRequest, Writer_ReadStreamServer) error {
	return status.Errorf(codes.Unimplemented, "method ReadStream not implemented")
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

func _Writer_Append_Handler(srv interface{}, ctx context.Context, dec func(interface{}) error, interceptor grpc.UnaryServerInterceptor) (interface{}, error) {
	in := new(AppendRequest)
	if err := dec(in); err != nil {
		return nil, err
	}
	if interceptor == nil {
		return srv.(WriterServer).Append(ctx, in)
	}
	info := &grpc.UnaryServerInfo{
		Server:     srv,
		FullMethod: Writer_Append_FullMethodName,
	}
	handler := func(ctx context.Context, req interface{}) (interface{}, error) {
		return srv.(WriterServer).Append(ctx, req.(*AppendRequest))
	}
	return interceptor(ctx, in, info, handler)
}

func _Writer_ReadStream_Handler(srv interface{}, stream grpc.ServerStream) error {
	m := new(ReadStreamRequest)
	if err := stream.RecvMsg(m); err != nil {
		return err
	}
	return srv.(WriterServer).ReadStream(m, &writerReadStreamServer{stream})
}

type Writer_ReadStreamServer interface {
	Send(*ReadStreamReplyItem) error
	grpc.ServerStream
}

type writerReadStreamServer struct {
	grpc.ServerStream
}

func (x *writerReadStreamServer) Send(m *ReadStreamReplyItem) error {
	return x.ServerStream.SendMsg(m)
}

// Writer_ServiceDesc is the grpc.ServiceDesc for Writer service.
// It's only intended for direct use with grpc.RegisterService,
// and not to be introspected or modified (even as a copy)
var Writer_ServiceDesc = grpc.ServiceDesc{
	ServiceName: "fossil.Writer",
	HandlerType: (*WriterServer)(nil),
	Methods: []grpc.MethodDesc{
		{
			MethodName: "Append",
			Handler:    _Writer_Append_Handler,
		},
	},
	Streams: []grpc.StreamDesc{
		{
			StreamName:    "ReadStream",
			Handler:       _Writer_ReadStream_Handler,
			ServerStreams: true,
		},
	},
	Metadata: "api/v1/store.proto",
}
