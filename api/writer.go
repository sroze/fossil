package api

import (
	"context"
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

		// Get the current currentStreamPosition.
		var currentStreamPosition uint64
		var err error
		if head == nil {
			currentStreamPosition = 0
		} else {
			currentStreamPosition = positionFromByteArray(head)
		}

		// Write the new event.
		eventPosition := currentStreamPosition + 1
		row, err := EncodeEventRow(EventRow{
			EventId:   in.EventId,
			EventType: in.EventType,
			Payload:   in.Payload,
		})
		if err != nil {
			return nil, err
		}

		t.Set(streamSpace.Sub("head"), positionAsByteArray(eventPosition))
		t.Set(EventInStreamKey(streamSpace, eventPosition), row)

		// TODO: + the data for the poller
		// @see https://apple.github.io/foundationdb/data-modeling.html#versionstamps
		// @see https://github.com/apple/foundationdb/pull/1187
		// t.Set(storeSpace.Sub(tuple.IncompleteVersionstamp()), "")

		// TODO: + heartbeat
		// TODO: Optimistic write control here.

		return &eventPosition, nil
	})

	if err != nil {
		return nil, err
	}

	return &v1.AppendReply{
		StreamPosition: *position.(*uint64),
	}, nil
}
