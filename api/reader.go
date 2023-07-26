package api

import (
	"fmt"
	"github.com/apple/foundationdb/bindings/go/src/fdb"
	"github.com/apple/foundationdb/bindings/go/src/fdb/subspace"
	"github.com/apple/foundationdb/bindings/go/src/fdb/tuple"
	"github.com/sroze/fossil/store/api/v1"
)

type watchHeadResult struct {
	HeadPosition uint64
	Future       fdb.FutureNil
}

func (s *Server) ReadStream(request *v1.ReadStreamRequest, server v1.Writer_ReadStreamServer) error {
	storeSpace := subspace.Sub(tuple.Tuple{"stores", "1234"})
	streamSpace := storeSpace.Sub("stream", request.StreamName)
	streamEventsSpace := streamSpace.Sub("events")

	result, err := s.db.ReadTransact(func(t fdb.ReadTransaction) (interface{}, error) {
		var readRange fdb.Range = streamEventsSpace

		if request.StartingPosition > 0 {
			readRange = fdb.KeyRange{
				Begin: streamEventsSpace.Pack(tuple.Tuple{positionAsByteArray(request.StartingPosition)}),
				End:   streamEventsSpace.Pack(tuple.Tuple{[]byte{0xFF}}),
			}
		}

		ri := t.GetRange(readRange, fdb.RangeOptions{}).Iterator()

		var streamPosition uint64 = 0

		for ri.Advance() {
			kv := ri.MustGet()
			keyTuples, err := streamEventsSpace.Unpack(kv.Key)
			if err != nil {
				return nil, fmt.Errorf("error while unpacking stream item key: %w", err)
			}

			streamPosition = positionFromByteArray(keyTuples[0].([]byte))
			row, err := DecodeEventRow(kv.Value)
			if err != nil {
				return nil, fmt.Errorf("error while decoding stream item: %w", err)
			}

			err = server.Send(&v1.ReadStreamReplyItem{
				EventId:        row.EventId,
				EventType:      row.EventType,
				Payload:        row.Payload,
				StreamPosition: streamPosition,
			})

			if err != nil {
				return nil, fmt.Errorf("error while sending stream item: %w", err)
			}
		}

		return streamPosition, nil
	})

	if err == nil && request.Subscribe {
		lastPosition := result.(uint64)

		// Watch the head for a change. When it changes, we'll read again, starting at the new position.
		result, err := s.db.Transact(func(t fdb.Transaction) (interface{}, error) {
			head := t.Get(streamSpace.Sub("head")).MustGet()
			future := t.Watch(streamSpace.Sub("head"))

			return watchHeadResult{
				HeadPosition: positionFromByteArray(head),
				Future:       future,
			}, nil
		})

		if err != nil {
			return fmt.Errorf("error while initialising watching head: %w", err)
		}

		watchResult := result.(watchHeadResult)
		if watchResult.HeadPosition != lastPosition {
			fmt.Println("Head changed between watching and last scan, let's read again!")
		} else {
			err := watchResult.Future.Get()

			if err != nil {
				return fmt.Errorf("error while watching head: %w", err)
			}
		}

		subRequest := request
		subRequest.StartingPosition = lastPosition + 1

		return s.ReadStream(subRequest, server)
	}

	return err
}
