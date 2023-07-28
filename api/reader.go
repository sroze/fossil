package api

import (
	"fmt"
	"github.com/apple/foundationdb/bindings/go/src/fdb"
	"github.com/sroze/fossil/store/api/v1"
)

func (s *Server) ReadStream(request *v1.ReadStreamRequest, server v1.Writer_ReadStreamServer) error {
	result, err := s.db.ReadTransact(func(t fdb.ReadTransaction) (interface{}, error) {
		ch := s.store.Read(server.Context(), t, request.StreamName, request.StartingPosition)
		var lastPosition uint64 = 0

		for item := range ch {
			if item.Error != nil {
				return nil, fmt.Errorf("error while reading stream: %w", item.Error)
			}

			err := server.Send(&v1.ReadStreamReplyItem{
				StreamPosition: item.StreamPosition,
				EventId:        item.Event.EventId,
				EventType:      item.Event.EventType,
				Payload:        item.Event.Payload,
			})

			if err != nil {
				return nil, fmt.Errorf("error while sending stream item: %w", err)
			}

			lastPosition = item.StreamPosition
		}

		return lastPosition, nil
	})

	if err == nil && request.Subscribe {
		lastPosition := result.(uint64)

		err := s.store.WaitForEvent(server.Context(), request.StreamName, lastPosition)
		if err != nil {
			return fmt.Errorf("error while waiting for event: %w", err)
		}

		subRequest := request
		subRequest.StartingPosition = lastPosition + 1

		return s.ReadStream(subRequest, server)
	}

	return err
}
