package server

import (
	"fmt"
	"github.com/sroze/fossil/api/v1"
	"github.com/sroze/fossil/streamstore"
)

func (s *Server) ReadStream(request *v1.ReadStreamRequest, server v1.Writer_ReadStreamServer) error {
	ch := make(chan streamstore.ReadItem, 10)
	if request.Subscribe {
		// FIXME: We need to implement this with LiveTail, the store itself
		//        doesn't support "read & follow" anymore.
		// go s.streamStore.ReadAndFollow(server.Context(), request.StreamName, request.StartingPosition, ch)
	} else {
		go s.streamStore.Read(server.Context(), request.StreamName, request.StartingPosition, ch)
	}

	for item := range ch {
		if item.Error != nil {
			return fmt.Errorf("error while reading stream: %w", item.Error)
		}

		if item.EventInStream != nil {
			err := server.Send(&v1.ReadStreamReplyItem{
				StreamPosition: item.EventInStream.Position,
				EventId:        item.EventInStream.Event.EventId,
				EventType:      item.EventInStream.Event.EventType,
				Payload:        item.EventInStream.Event.Payload,
			})

			if err != nil {
				return fmt.Errorf("error while sending stream item: %w", err)
			}
		}
	}

	return nil
}
