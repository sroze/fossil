package streamstore

import (
	"context"
	"fmt"
	"github.com/apple/foundationdb/bindings/go/src/fdb"
)

func (ss SegmentStore) Read(ctx context.Context, stream string, startingPosition int64, ch chan ReadItem) {
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
