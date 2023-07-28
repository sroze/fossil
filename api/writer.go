package api

import (
	"context"
	"github.com/apple/foundationdb/bindings/go/src/fdb"
	"github.com/sroze/fossil/store/api/store"
	"github.com/sroze/fossil/store/api/v1"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

func (s *Server) AppendEvent(ctx context.Context, in *v1.AppendRequest) (*v1.AppendReply, error) {
	if in.EventType == "" {
		return nil, status.Errorf(codes.InvalidArgument,
			"Events must have a type.")
	}

	result, err := s.db.Transact(func(t fdb.Transaction) (interface{}, error) {
		return s.store.AppendEvent(t, in.StreamName, []store.Event{
			{
				EventId:   in.EventId,
				EventType: in.EventType,
				Payload:   in.Payload,
			},
		}, in.ExpectedPosition)

		// TODO: + the data for the poller (+ maybe heartbeat?)
		// @see https://apple.github.io/foundationdb/data-modeling.html#versionstamps
		// @see https://github.com/apple/foundationdb/pull/1187
		// t.Set(storeSpace.Sub(tuple.IncompleteVersionstamp()), "")
	})

	if err != nil {
		return nil, err
	}

	return &v1.AppendReply{
		StreamPosition: result.(*store.AppendResult).StreamPosition,
	}, nil
}
