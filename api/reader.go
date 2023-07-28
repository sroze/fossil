package api

import (
	"fmt"
	"github.com/sroze/fossil/store/api/streamstore"
	"github.com/sroze/fossil/store/api/v1"
)

func (s *Server) ReadStream(request *v1.ReadStreamRequest, server v1.Writer_ReadStreamServer) error {
	var ch chan streamstore.ReadItem
	if request.Subscribe {
		ch = s.store.ReadAndListen(server.Context(), request.StreamName, request.StartingPosition)
	} else {
		ch = s.store.Read(server.Context(), request.StreamName, request.StartingPosition)
	}

	for item := range ch {
		if item.Error != nil {
			return fmt.Errorf("error while reading stream: %w", item.Error)
		}

		err := server.Send(&v1.ReadStreamReplyItem{
			StreamPosition: item.StreamPosition,
			EventId:        item.Event.EventId,
			EventType:      item.Event.EventType,
			Payload:        item.Event.Payload,
		})

		if err != nil {
			return fmt.Errorf("error while sending stream item: %w", err)
		}
	}

	return nil
}
