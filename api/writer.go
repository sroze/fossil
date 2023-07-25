package api

import (
	"context"
	"encoding/binary"
	"github.com/apple/foundationdb/bindings/go/src/fdb"
	"github.com/apple/foundationdb/bindings/go/src/fdb/subspace"
	"github.com/apple/foundationdb/bindings/go/src/fdb/tuple"
	"github.com/sroze/fossil/store/api/v1"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

func (s *Server) AppendEvent(ctx context.Context, in *v1.AppendRequest) (*v1.AppendReply, error) {
	if in.EventType == "" {
		return nil, status.Errorf(codes.InvalidArgument,
			"Events must have a type.")
	}

	// TODO: can the 'stream name' be simply `/something/with/unlimited/depth'?
	storeSpace := subspace.Sub(tuple.Tuple{"stores", "1234"})
	streamSpace := storeSpace.Sub("stream", in.StreamName)

	position, err := s.db.Transact(func(t fdb.Transaction) (interface{}, error) {
		head := t.Get(streamSpace.Sub("head")).MustGet()

		var position uint16
		if head == nil {
			position = 1
		} else {
			position = binary.LittleEndian.Uint16(head) + 1
		}

		b := make([]byte, 2) // 2 bytes for uint16.
		binary.LittleEndian.PutUint16(b, position)
		t.Set(streamSpace.Sub("head"), b)
		t.Set(streamSpace.Sub("events").Pack(tuple.Tuple{
			int64(position),
			in.EventId,
			in.EventType,
		}), in.Payload)

		// TODO: + the data for the poller
		// @see https://apple.github.io/foundationdb/data-modeling.html#versionstamps
		// @see https://github.com/apple/foundationdb/pull/1187
		// t.Set(storeSpace.Sub(tuple.IncompleteVersionstamp()), "")

		// TODO: + heartbeat
		// TODO: Optimistic write control here.

		return &position, nil
	})

	if err != nil {
		return nil, err
	}

	return &v1.AppendReply{
		StreamPosition: uint32(*position.(*uint16)),
	}, nil
}
