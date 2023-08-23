package server

import (
	"context"
	"fmt"
	"github.com/sroze/fossil/api/v1"
	"github.com/sroze/fossil/simplestore"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

func TransformEvent(request *v1.EventToAppend) (simplestore.Event, error) {
	if request.EventType == "" {
		return simplestore.Event{}, status.Errorf(codes.InvalidArgument,
			"Events must have a type.")
	}

	return simplestore.Event{
		EventId:   request.EventId,
		EventType: request.EventType,
		Payload:   request.Payload,
	}, nil
}

func TransformEvents(events []*v1.EventToAppend) ([]simplestore.Event, error) {
	transformed := make([]simplestore.Event, len(events))

	for i, event := range events {
		transformEvent, err := TransformEvent(event)
		if err != nil {
			return nil, fmt.Errorf("error with event #%d: %w", i, err)
		}

		transformed[i] = transformEvent
	}

	return transformed, nil
}

func (s *Server) Append(ctx context.Context, in *v1.AppendRequest) (*v1.AppendReply, error) {
	events, err := TransformEvents(in.Events)
	if err != nil {
		return nil, err
	}

	command := simplestore.AppendToStream{
		Stream: in.StreamName,
		Events: events,
	}
	if in.ExpectedPosition != nil {
		command.Condition = &simplestore.AppendCondition{
			WriteAtPosition: *in.ExpectedPosition + 1,
		}
	}

	result, err := s.store.Write(ctx, []simplestore.AppendToStream{command})
	if err != nil {
		if _, cf := err.(simplestore.StreamConditionFailed); cf {
			return nil, status.Errorf(codes.FailedPrecondition, err.Error())
		}

		return nil, err
	}

	return &v1.AppendReply{
		StreamPosition: result[0].Position,
	}, nil
}
