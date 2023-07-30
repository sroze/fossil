package streamstore

import (
	"context"
	"fmt"
	"github.com/apple/foundationdb/bindings/go/src/fdb"
)

func (ss FoundationDBStore) Read(ctx context.Context, stream string, startingPosition uint64, ch chan ReadItem) {
	defer close(ch)

	_, err := ss.db.ReadTransact(func(t fdb.ReadTransaction) (interface{}, error) {
		ri := t.GetRange(StreamEventsKeyRange(stream, startingPosition), fdb.RangeOptions{}).Iterator()

		for ri.Advance() {
			kv := ri.MustGet()
			event, err := EventInStreamFromKeyValue(kv)
			if err != nil {
				return nil, fmt.Errorf("error while decoding stream item: %w", err)
			}

			ch <- ReadItem{
				EventInStream: &event,
			}

			// Check that the context is not done before continuing.
			select {
			case <-ctx.Done():
				break
			default:
			}
		}

		return nil, nil
	})

	if err != nil {
		ch <- ReadItem{
			Error: fmt.Errorf("error while reading stream: %w", err),
		}
	}
}

func (ss FoundationDBStore) ReadAndFollow(ctx context.Context, stream string, startingPosition uint64, ch chan ReadItem) {
	defer close(ch)

	for {
		var lastPosition uint64 = 0
		readChannel := make(chan ReadItem)
		go func() {
			for item := range readChannel {
				ch <- item

				if item.Error != nil {
					return
				}

				if item.EventInStream != nil {
					lastPosition = item.EventInStream.StreamPosition
				}
			}
		}()

		// Read the whole stream.
		ss.Read(ctx, stream, startingPosition, readChannel)

		// If the end of the stream notification is requested, we notify.
		ch <- ReadItem{
			EndOfStreamSignal: &EndOfStreamSignal{
				StreamPosition: lastPosition,
			},
		}

		// Wait for additional events to arrive.
		err := ss.WaitForEvent(ctx, stream, lastPosition)
		if err != nil {
			ch <- ReadItem{
				Error: fmt.Errorf("error while waiting for event: %w", err),
			}

			return
		}

		// Let'ss get events!
		startingPosition = lastPosition + 1

		// If context is done, we stop:
		select {
		case <-ctx.Done():
			return
		default:
			continue
		}
	}
}
