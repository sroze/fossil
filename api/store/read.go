package store

import (
	"context"
	"fmt"
	"github.com/apple/foundationdb/bindings/go/src/fdb"
	"github.com/apple/foundationdb/bindings/go/src/fdb/tuple"
)

var TransactionContextKey = "transaction"

type ReadItem struct {
	Event          *Event
	StreamPosition uint64
	Error          error
}

func (s FoundationDBStore) Read(ctx context.Context, stream string, startingPosition uint64) chan ReadItem {
	// If `Read` is called without a transaction in the context, we create it and call `Read` again.
	t, ok := ctx.Value(TransactionContextKey).(fdb.ReadTransaction)
	if !ok {
		ch := make(chan ReadItem)

		go func() {
			defer close(ch)
			_, err := s.db.ReadTransact(func(t fdb.ReadTransaction) (interface{}, error) {
				for item := range s.Read(context.WithValue(ctx, TransactionContextKey, t), stream, startingPosition) {
					ch <- item

					if item.Error != nil {
						break
					}
				}

				return nil, nil
			})

			if err != nil {
				ch <- ReadItem{
					Error: fmt.Errorf("error while setting up a transaction: %w", err),
				}
			}
		}()

		return ch
	}

	streamSpace := streamInStoreSpace(stream)
	streamEventsSpace := eventsInStreamSpace(streamSpace)

	var readRange fdb.Range = streamEventsSpace
	if startingPosition > 0 {
		readRange = fdb.KeyRange{
			Begin: streamEventsSpace.Pack(tuple.Tuple{positionAsByteArray(startingPosition)}),
			End:   streamEventsSpace.Pack(tuple.Tuple{[]byte{0xFF}}),
		}
	}

	ch := make(chan ReadItem)
	go (func() {
		defer close(ch)

		ri := t.GetRange(readRange, fdb.RangeOptions{}).Iterator()

		for ri.Advance() {
			kv := ri.MustGet()
			keyTuples, err := streamEventsSpace.Unpack(kv.Key)
			if err != nil {
				ch <- ReadItem{
					Error: fmt.Errorf("error while unpacking stream item key: %w", err),
				}
				return
			}

			streamPosition := positionFromByteArray(keyTuples[0].([]byte))
			row, err := DecodeEvent(kv.Value)
			if err != nil {
				ch <- ReadItem{
					Error: fmt.Errorf("error while decoding stream item: %w", err),
				}
				return
			}

			ch <- ReadItem{
				Event:          row,
				StreamPosition: streamPosition,
			}

			// Check that the context is not done before continuing.
			select {
			case <-ctx.Done():
				return
			default:
			}
		}
	})()

	return ch
}

// ReadAndListen reads the stream and listens for new events.
func (s FoundationDBStore) ReadAndListen(ctx context.Context, stream string, startingPosition uint64) chan ReadItem {
	ch := make(chan ReadItem)

	go func() {
		defer close(ch)

		for {
			var lastPosition uint64 = 0
			for item := range s.Read(ctx, stream, startingPosition) {
				ch <- item

				if item.Error != nil {
					return
				}

				lastPosition = item.StreamPosition
			}

			err := s.WaitForEvent(ctx, stream, lastPosition)
			if err != nil {
				ch <- ReadItem{
					Error: fmt.Errorf("error while waiting for event: %w", err),
				}

				return
			}

			// Let's get events!
			startingPosition = lastPosition + 1

			// If context is done, we stop:
			select {
			case <-ctx.Done():
				return
			default:
				// continue!
			}
		}
	}()

	return ch
}
