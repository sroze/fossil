// Code generated by protoc-gen-go. DO NOT EDIT.
// versions:
// 	protoc-gen-go v1.31.0
// 	protoc        v4.23.4
// source: api/v1/store.proto

package v1

import (
	protoreflect "google.golang.org/protobuf/reflect/protoreflect"
	protoimpl "google.golang.org/protobuf/runtime/protoimpl"
	reflect "reflect"
	sync "sync"
)

const (
	// Verify that this generated code is sufficiently up-to-date.
	_ = protoimpl.EnforceVersion(20 - protoimpl.MinVersion)
	// Verify that runtime/protoimpl is sufficiently up-to-date.
	_ = protoimpl.EnforceVersion(protoimpl.MaxVersion - 20)
)

// Appends an event to the store.
type AppendRequest struct {
	state         protoimpl.MessageState
	sizeCache     protoimpl.SizeCache
	unknownFields protoimpl.UnknownFields

	StreamName string `protobuf:"bytes,1,opt,name=stream_name,json=streamName,proto3" json:"stream_name,omitempty"`
	EventId    string `protobuf:"bytes,2,opt,name=event_id,json=eventId,proto3" json:"event_id,omitempty"`
	EventType  string `protobuf:"bytes,3,opt,name=event_type,json=eventType,proto3" json:"event_type,omitempty"`
	Payload    []byte `protobuf:"bytes,4,opt,name=payload,proto3" json:"payload,omitempty"`
}

func (x *AppendRequest) Reset() {
	*x = AppendRequest{}
	if protoimpl.UnsafeEnabled {
		mi := &file_api_v1_store_proto_msgTypes[0]
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		ms.StoreMessageInfo(mi)
	}
}

func (x *AppendRequest) String() string {
	return protoimpl.X.MessageStringOf(x)
}

func (*AppendRequest) ProtoMessage() {}

func (x *AppendRequest) ProtoReflect() protoreflect.Message {
	mi := &file_api_v1_store_proto_msgTypes[0]
	if protoimpl.UnsafeEnabled && x != nil {
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		if ms.LoadMessageInfo() == nil {
			ms.StoreMessageInfo(mi)
		}
		return ms
	}
	return mi.MessageOf(x)
}

// Deprecated: Use AppendRequest.ProtoReflect.Descriptor instead.
func (*AppendRequest) Descriptor() ([]byte, []int) {
	return file_api_v1_store_proto_rawDescGZIP(), []int{0}
}

func (x *AppendRequest) GetStreamName() string {
	if x != nil {
		return x.StreamName
	}
	return ""
}

func (x *AppendRequest) GetEventId() string {
	if x != nil {
		return x.EventId
	}
	return ""
}

func (x *AppendRequest) GetEventType() string {
	if x != nil {
		return x.EventType
	}
	return ""
}

func (x *AppendRequest) GetPayload() []byte {
	if x != nil {
		return x.Payload
	}
	return nil
}

// The response message after successfully appending an event to the store.
type AppendReply struct {
	state         protoimpl.MessageState
	sizeCache     protoimpl.SizeCache
	unknownFields protoimpl.UnknownFields

	StreamPosition uint64 `protobuf:"varint,1,opt,name=stream_position,json=streamPosition,proto3" json:"stream_position,omitempty"`
}

func (x *AppendReply) Reset() {
	*x = AppendReply{}
	if protoimpl.UnsafeEnabled {
		mi := &file_api_v1_store_proto_msgTypes[1]
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		ms.StoreMessageInfo(mi)
	}
}

func (x *AppendReply) String() string {
	return protoimpl.X.MessageStringOf(x)
}

func (*AppendReply) ProtoMessage() {}

func (x *AppendReply) ProtoReflect() protoreflect.Message {
	mi := &file_api_v1_store_proto_msgTypes[1]
	if protoimpl.UnsafeEnabled && x != nil {
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		if ms.LoadMessageInfo() == nil {
			ms.StoreMessageInfo(mi)
		}
		return ms
	}
	return mi.MessageOf(x)
}

// Deprecated: Use AppendReply.ProtoReflect.Descriptor instead.
func (*AppendReply) Descriptor() ([]byte, []int) {
	return file_api_v1_store_proto_rawDescGZIP(), []int{1}
}

func (x *AppendReply) GetStreamPosition() uint64 {
	if x != nil {
		return x.StreamPosition
	}
	return 0
}

type ReadStreamRequest struct {
	state         protoimpl.MessageState
	sizeCache     protoimpl.SizeCache
	unknownFields protoimpl.UnknownFields

	StreamName string `protobuf:"bytes,1,opt,name=stream_name,json=streamName,proto3" json:"stream_name,omitempty"`
	// Allows to set a starting position. When set at `0`, the starting position is the beginning of the stream.
	StartingPosition uint64 `protobuf:"varint,2,opt,name=starting_position,json=startingPosition,proto3" json:"starting_position,omitempty"`
	// If true, subscribe to the stream and receive new events as they are appended.
	Subscribe bool `protobuf:"varint,3,opt,name=subscribe,proto3" json:"subscribe,omitempty"`
}

func (x *ReadStreamRequest) Reset() {
	*x = ReadStreamRequest{}
	if protoimpl.UnsafeEnabled {
		mi := &file_api_v1_store_proto_msgTypes[2]
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		ms.StoreMessageInfo(mi)
	}
}

func (x *ReadStreamRequest) String() string {
	return protoimpl.X.MessageStringOf(x)
}

func (*ReadStreamRequest) ProtoMessage() {}

func (x *ReadStreamRequest) ProtoReflect() protoreflect.Message {
	mi := &file_api_v1_store_proto_msgTypes[2]
	if protoimpl.UnsafeEnabled && x != nil {
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		if ms.LoadMessageInfo() == nil {
			ms.StoreMessageInfo(mi)
		}
		return ms
	}
	return mi.MessageOf(x)
}

// Deprecated: Use ReadStreamRequest.ProtoReflect.Descriptor instead.
func (*ReadStreamRequest) Descriptor() ([]byte, []int) {
	return file_api_v1_store_proto_rawDescGZIP(), []int{2}
}

func (x *ReadStreamRequest) GetStreamName() string {
	if x != nil {
		return x.StreamName
	}
	return ""
}

func (x *ReadStreamRequest) GetStartingPosition() uint64 {
	if x != nil {
		return x.StartingPosition
	}
	return 0
}

func (x *ReadStreamRequest) GetSubscribe() bool {
	if x != nil {
		return x.Subscribe
	}
	return false
}

type ReadStreamReplyItem struct {
	state         protoimpl.MessageState
	sizeCache     protoimpl.SizeCache
	unknownFields protoimpl.UnknownFields

	EventId        string `protobuf:"bytes,1,opt,name=event_id,json=eventId,proto3" json:"event_id,omitempty"`
	EventType      string `protobuf:"bytes,2,opt,name=event_type,json=eventType,proto3" json:"event_type,omitempty"`
	StreamPosition uint64 `protobuf:"varint,3,opt,name=stream_position,json=streamPosition,proto3" json:"stream_position,omitempty"`
	Payload        []byte `protobuf:"bytes,4,opt,name=payload,proto3" json:"payload,omitempty"`
}

func (x *ReadStreamReplyItem) Reset() {
	*x = ReadStreamReplyItem{}
	if protoimpl.UnsafeEnabled {
		mi := &file_api_v1_store_proto_msgTypes[3]
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		ms.StoreMessageInfo(mi)
	}
}

func (x *ReadStreamReplyItem) String() string {
	return protoimpl.X.MessageStringOf(x)
}

func (*ReadStreamReplyItem) ProtoMessage() {}

func (x *ReadStreamReplyItem) ProtoReflect() protoreflect.Message {
	mi := &file_api_v1_store_proto_msgTypes[3]
	if protoimpl.UnsafeEnabled && x != nil {
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		if ms.LoadMessageInfo() == nil {
			ms.StoreMessageInfo(mi)
		}
		return ms
	}
	return mi.MessageOf(x)
}

// Deprecated: Use ReadStreamReplyItem.ProtoReflect.Descriptor instead.
func (*ReadStreamReplyItem) Descriptor() ([]byte, []int) {
	return file_api_v1_store_proto_rawDescGZIP(), []int{3}
}

func (x *ReadStreamReplyItem) GetEventId() string {
	if x != nil {
		return x.EventId
	}
	return ""
}

func (x *ReadStreamReplyItem) GetEventType() string {
	if x != nil {
		return x.EventType
	}
	return ""
}

func (x *ReadStreamReplyItem) GetStreamPosition() uint64 {
	if x != nil {
		return x.StreamPosition
	}
	return 0
}

func (x *ReadStreamReplyItem) GetPayload() []byte {
	if x != nil {
		return x.Payload
	}
	return nil
}

var File_api_v1_store_proto protoreflect.FileDescriptor

var file_api_v1_store_proto_rawDesc = []byte{
	0x0a, 0x12, 0x61, 0x70, 0x69, 0x2f, 0x76, 0x31, 0x2f, 0x73, 0x74, 0x6f, 0x72, 0x65, 0x2e, 0x70,
	0x72, 0x6f, 0x74, 0x6f, 0x12, 0x06, 0x66, 0x6f, 0x73, 0x73, 0x69, 0x6c, 0x22, 0x84, 0x01, 0x0a,
	0x0d, 0x41, 0x70, 0x70, 0x65, 0x6e, 0x64, 0x52, 0x65, 0x71, 0x75, 0x65, 0x73, 0x74, 0x12, 0x1f,
	0x0a, 0x0b, 0x73, 0x74, 0x72, 0x65, 0x61, 0x6d, 0x5f, 0x6e, 0x61, 0x6d, 0x65, 0x18, 0x01, 0x20,
	0x01, 0x28, 0x09, 0x52, 0x0a, 0x73, 0x74, 0x72, 0x65, 0x61, 0x6d, 0x4e, 0x61, 0x6d, 0x65, 0x12,
	0x19, 0x0a, 0x08, 0x65, 0x76, 0x65, 0x6e, 0x74, 0x5f, 0x69, 0x64, 0x18, 0x02, 0x20, 0x01, 0x28,
	0x09, 0x52, 0x07, 0x65, 0x76, 0x65, 0x6e, 0x74, 0x49, 0x64, 0x12, 0x1d, 0x0a, 0x0a, 0x65, 0x76,
	0x65, 0x6e, 0x74, 0x5f, 0x74, 0x79, 0x70, 0x65, 0x18, 0x03, 0x20, 0x01, 0x28, 0x09, 0x52, 0x09,
	0x65, 0x76, 0x65, 0x6e, 0x74, 0x54, 0x79, 0x70, 0x65, 0x12, 0x18, 0x0a, 0x07, 0x70, 0x61, 0x79,
	0x6c, 0x6f, 0x61, 0x64, 0x18, 0x04, 0x20, 0x01, 0x28, 0x0c, 0x52, 0x07, 0x70, 0x61, 0x79, 0x6c,
	0x6f, 0x61, 0x64, 0x22, 0x36, 0x0a, 0x0b, 0x41, 0x70, 0x70, 0x65, 0x6e, 0x64, 0x52, 0x65, 0x70,
	0x6c, 0x79, 0x12, 0x27, 0x0a, 0x0f, 0x73, 0x74, 0x72, 0x65, 0x61, 0x6d, 0x5f, 0x70, 0x6f, 0x73,
	0x69, 0x74, 0x69, 0x6f, 0x6e, 0x18, 0x01, 0x20, 0x01, 0x28, 0x04, 0x52, 0x0e, 0x73, 0x74, 0x72,
	0x65, 0x61, 0x6d, 0x50, 0x6f, 0x73, 0x69, 0x74, 0x69, 0x6f, 0x6e, 0x22, 0x7f, 0x0a, 0x11, 0x52,
	0x65, 0x61, 0x64, 0x53, 0x74, 0x72, 0x65, 0x61, 0x6d, 0x52, 0x65, 0x71, 0x75, 0x65, 0x73, 0x74,
	0x12, 0x1f, 0x0a, 0x0b, 0x73, 0x74, 0x72, 0x65, 0x61, 0x6d, 0x5f, 0x6e, 0x61, 0x6d, 0x65, 0x18,
	0x01, 0x20, 0x01, 0x28, 0x09, 0x52, 0x0a, 0x73, 0x74, 0x72, 0x65, 0x61, 0x6d, 0x4e, 0x61, 0x6d,
	0x65, 0x12, 0x2b, 0x0a, 0x11, 0x73, 0x74, 0x61, 0x72, 0x74, 0x69, 0x6e, 0x67, 0x5f, 0x70, 0x6f,
	0x73, 0x69, 0x74, 0x69, 0x6f, 0x6e, 0x18, 0x02, 0x20, 0x01, 0x28, 0x04, 0x52, 0x10, 0x73, 0x74,
	0x61, 0x72, 0x74, 0x69, 0x6e, 0x67, 0x50, 0x6f, 0x73, 0x69, 0x74, 0x69, 0x6f, 0x6e, 0x12, 0x1c,
	0x0a, 0x09, 0x73, 0x75, 0x62, 0x73, 0x63, 0x72, 0x69, 0x62, 0x65, 0x18, 0x03, 0x20, 0x01, 0x28,
	0x08, 0x52, 0x09, 0x73, 0x75, 0x62, 0x73, 0x63, 0x72, 0x69, 0x62, 0x65, 0x22, 0x92, 0x01, 0x0a,
	0x13, 0x52, 0x65, 0x61, 0x64, 0x53, 0x74, 0x72, 0x65, 0x61, 0x6d, 0x52, 0x65, 0x70, 0x6c, 0x79,
	0x49, 0x74, 0x65, 0x6d, 0x12, 0x19, 0x0a, 0x08, 0x65, 0x76, 0x65, 0x6e, 0x74, 0x5f, 0x69, 0x64,
	0x18, 0x01, 0x20, 0x01, 0x28, 0x09, 0x52, 0x07, 0x65, 0x76, 0x65, 0x6e, 0x74, 0x49, 0x64, 0x12,
	0x1d, 0x0a, 0x0a, 0x65, 0x76, 0x65, 0x6e, 0x74, 0x5f, 0x74, 0x79, 0x70, 0x65, 0x18, 0x02, 0x20,
	0x01, 0x28, 0x09, 0x52, 0x09, 0x65, 0x76, 0x65, 0x6e, 0x74, 0x54, 0x79, 0x70, 0x65, 0x12, 0x27,
	0x0a, 0x0f, 0x73, 0x74, 0x72, 0x65, 0x61, 0x6d, 0x5f, 0x70, 0x6f, 0x73, 0x69, 0x74, 0x69, 0x6f,
	0x6e, 0x18, 0x03, 0x20, 0x01, 0x28, 0x04, 0x52, 0x0e, 0x73, 0x74, 0x72, 0x65, 0x61, 0x6d, 0x50,
	0x6f, 0x73, 0x69, 0x74, 0x69, 0x6f, 0x6e, 0x12, 0x18, 0x0a, 0x07, 0x70, 0x61, 0x79, 0x6c, 0x6f,
	0x61, 0x64, 0x18, 0x04, 0x20, 0x01, 0x28, 0x0c, 0x52, 0x07, 0x70, 0x61, 0x79, 0x6c, 0x6f, 0x61,
	0x64, 0x32, 0x8f, 0x01, 0x0a, 0x06, 0x57, 0x72, 0x69, 0x74, 0x65, 0x72, 0x12, 0x3b, 0x0a, 0x0b,
	0x41, 0x70, 0x70, 0x65, 0x6e, 0x64, 0x45, 0x76, 0x65, 0x6e, 0x74, 0x12, 0x15, 0x2e, 0x66, 0x6f,
	0x73, 0x73, 0x69, 0x6c, 0x2e, 0x41, 0x70, 0x70, 0x65, 0x6e, 0x64, 0x52, 0x65, 0x71, 0x75, 0x65,
	0x73, 0x74, 0x1a, 0x13, 0x2e, 0x66, 0x6f, 0x73, 0x73, 0x69, 0x6c, 0x2e, 0x41, 0x70, 0x70, 0x65,
	0x6e, 0x64, 0x52, 0x65, 0x70, 0x6c, 0x79, 0x22, 0x00, 0x12, 0x48, 0x0a, 0x0a, 0x52, 0x65, 0x61,
	0x64, 0x53, 0x74, 0x72, 0x65, 0x61, 0x6d, 0x12, 0x19, 0x2e, 0x66, 0x6f, 0x73, 0x73, 0x69, 0x6c,
	0x2e, 0x52, 0x65, 0x61, 0x64, 0x53, 0x74, 0x72, 0x65, 0x61, 0x6d, 0x52, 0x65, 0x71, 0x75, 0x65,
	0x73, 0x74, 0x1a, 0x1b, 0x2e, 0x66, 0x6f, 0x73, 0x73, 0x69, 0x6c, 0x2e, 0x52, 0x65, 0x61, 0x64,
	0x53, 0x74, 0x72, 0x65, 0x61, 0x6d, 0x52, 0x65, 0x70, 0x6c, 0x79, 0x49, 0x74, 0x65, 0x6d, 0x22,
	0x00, 0x30, 0x01, 0x42, 0x26, 0x5a, 0x24, 0x67, 0x69, 0x74, 0x68, 0x75, 0x62, 0x2e, 0x63, 0x6f,
	0x6d, 0x2f, 0x73, 0x72, 0x6f, 0x7a, 0x65, 0x2f, 0x66, 0x6f, 0x73, 0x73, 0x69, 0x6c, 0x2f, 0x73,
	0x74, 0x6f, 0x72, 0x65, 0x2f, 0x61, 0x70, 0x69, 0x2f, 0x76, 0x31, 0x62, 0x06, 0x70, 0x72, 0x6f,
	0x74, 0x6f, 0x33,
}

var (
	file_api_v1_store_proto_rawDescOnce sync.Once
	file_api_v1_store_proto_rawDescData = file_api_v1_store_proto_rawDesc
)

func file_api_v1_store_proto_rawDescGZIP() []byte {
	file_api_v1_store_proto_rawDescOnce.Do(func() {
		file_api_v1_store_proto_rawDescData = protoimpl.X.CompressGZIP(file_api_v1_store_proto_rawDescData)
	})
	return file_api_v1_store_proto_rawDescData
}

var file_api_v1_store_proto_msgTypes = make([]protoimpl.MessageInfo, 4)
var file_api_v1_store_proto_goTypes = []interface{}{
	(*AppendRequest)(nil),       // 0: fossil.AppendRequest
	(*AppendReply)(nil),         // 1: fossil.AppendReply
	(*ReadStreamRequest)(nil),   // 2: fossil.ReadStreamRequest
	(*ReadStreamReplyItem)(nil), // 3: fossil.ReadStreamReplyItem
}
var file_api_v1_store_proto_depIdxs = []int32{
	0, // 0: fossil.Writer.AppendEvent:input_type -> fossil.AppendRequest
	2, // 1: fossil.Writer.ReadStream:input_type -> fossil.ReadStreamRequest
	1, // 2: fossil.Writer.AppendEvent:output_type -> fossil.AppendReply
	3, // 3: fossil.Writer.ReadStream:output_type -> fossil.ReadStreamReplyItem
	2, // [2:4] is the sub-list for method output_type
	0, // [0:2] is the sub-list for method input_type
	0, // [0:0] is the sub-list for extension type_name
	0, // [0:0] is the sub-list for extension extendee
	0, // [0:0] is the sub-list for field type_name
}

func init() { file_api_v1_store_proto_init() }
func file_api_v1_store_proto_init() {
	if File_api_v1_store_proto != nil {
		return
	}
	if !protoimpl.UnsafeEnabled {
		file_api_v1_store_proto_msgTypes[0].Exporter = func(v interface{}, i int) interface{} {
			switch v := v.(*AppendRequest); i {
			case 0:
				return &v.state
			case 1:
				return &v.sizeCache
			case 2:
				return &v.unknownFields
			default:
				return nil
			}
		}
		file_api_v1_store_proto_msgTypes[1].Exporter = func(v interface{}, i int) interface{} {
			switch v := v.(*AppendReply); i {
			case 0:
				return &v.state
			case 1:
				return &v.sizeCache
			case 2:
				return &v.unknownFields
			default:
				return nil
			}
		}
		file_api_v1_store_proto_msgTypes[2].Exporter = func(v interface{}, i int) interface{} {
			switch v := v.(*ReadStreamRequest); i {
			case 0:
				return &v.state
			case 1:
				return &v.sizeCache
			case 2:
				return &v.unknownFields
			default:
				return nil
			}
		}
		file_api_v1_store_proto_msgTypes[3].Exporter = func(v interface{}, i int) interface{} {
			switch v := v.(*ReadStreamReplyItem); i {
			case 0:
				return &v.state
			case 1:
				return &v.sizeCache
			case 2:
				return &v.unknownFields
			default:
				return nil
			}
		}
	}
	type x struct{}
	out := protoimpl.TypeBuilder{
		File: protoimpl.DescBuilder{
			GoPackagePath: reflect.TypeOf(x{}).PkgPath(),
			RawDescriptor: file_api_v1_store_proto_rawDesc,
			NumEnums:      0,
			NumMessages:   4,
			NumExtensions: 0,
			NumServices:   1,
		},
		GoTypes:           file_api_v1_store_proto_goTypes,
		DependencyIndexes: file_api_v1_store_proto_depIdxs,
		MessageInfos:      file_api_v1_store_proto_msgTypes,
	}.Build()
	File_api_v1_store_proto = out.File
	file_api_v1_store_proto_rawDesc = nil
	file_api_v1_store_proto_goTypes = nil
	file_api_v1_store_proto_depIdxs = nil
}
