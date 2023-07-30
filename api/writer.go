package api

import (
	"context"
	"github.com/sroze/fossil/store/api/streamstore"
	"github.com/sroze/fossil/store/api/v1"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

func (s *Server) AppendEvent(ctx context.Context, in *v1.AppendRequest) (*v1.AppendReply, error) {
	if in.EventType == "" {
		return nil, status.Errorf(codes.InvalidArgument,
			"Events must have a type.")
	}

	result, err := s.streamStore.Write([]streamstore.AppendToStream{
		{
			Stream:           in.StreamName,
			ExpectedPosition: in.ExpectedPosition,
			Events: []streamstore.Event{
				{
					EventId:   in.EventId,
					EventType: in.EventType,
					Payload:   in.Payload,
				},
			},
		},
	})

	// @see https://apple.github.io/foundationdb/data-modeling.html#versionstamps
	// @see https://github.com/apple/foundationdb/pull/1187
	// t.Set(storeSpace.Sub(tuple.IncompleteVersionstamp()), "")
	// TODO: + the data for the poller (+ maybe heartbeat?)

	if err != nil {
		return nil, err
	}

	return &v1.AppendReply{
		StreamPosition: result[0].StreamPosition,
	}, nil
}
