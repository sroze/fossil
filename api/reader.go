package api

import (
	"github.com/apple/foundationdb/bindings/go/src/fdb"
	"github.com/apple/foundationdb/bindings/go/src/fdb/subspace"
	"github.com/apple/foundationdb/bindings/go/src/fdb/tuple"
	"github.com/sroze/fossil/store/api/v1"
)

func (s *Server) ReadStream(request *v1.ReadStreamRequest, server v1.Writer_ReadStreamServer) error {
	storeSpace := subspace.Sub(tuple.Tuple{"stores", "1234"})
	streamSpace := storeSpace.Sub("stream", request.StreamName)
	streamEventsSpace := streamSpace.Sub("events")

	_, err := s.db.ReadTransact(func(t fdb.ReadTransaction) (interface{}, error) {
		ri := t.GetRange(streamEventsSpace, fdb.RangeOptions{}).Iterator()

		for ri.Advance() {
			kv := ri.MustGet()
			t, err := streamEventsSpace.Unpack(kv.Key)
			if err != nil {
				return nil, err
			}

			// TODO: extract 'pack' / 'unpack' in its own struct.
			position := t[0].(int64)
			eventId := t[1].(string)
			eventType := t[2].(string)

			err = server.Send(&v1.ReadStreamReplyItem{
				EventId:        eventId,
				EventType:      eventType,
				StreamPosition: uint32(position),
				Payload:        kv.Value,
			})

			if err != nil {
				return nil, err
			}
		}

		return nil, nil
	})

	return err
}
