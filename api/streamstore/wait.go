package streamstore

import (
	"context"
	"fmt"
	"github.com/apple/foundationdb/bindings/go/src/fdb"
)

type watchHeadResult struct {
	HeadPosition uint64
	Future       fdb.FutureNil
}

// WaitForEvent waits for an event to be written to the stream and returns the position of the event.
func (ss FoundationDBStore) WaitForEvent(ctx context.Context, stream string, currentPosition uint64) error {
	headKey := headInStreamKey(stream)

	// Watch the head for a change. We'll validate that _current_ position is not different from the
	// one currently expected.
	result, err := ss.db.Transact(func(t fdb.Transaction) (interface{}, error) {
		head := t.Get(headKey).MustGet()
		future := t.Watch(headKey)

		return watchHeadResult{
			HeadPosition: positionFromByteArray(head),
			Future:       future,
		}, nil
	})

	if err != nil {
		return fmt.Errorf("error while initialising watching head: %w", err)
	}

	watchResult := result.(watchHeadResult)
	if watchResult.HeadPosition == currentPosition {
		select {
		case <-ctx.Done():
			return nil
		case err := <-futureNilAsChannel(watchResult.Future):
			if err != nil {
				return fmt.Errorf("error while watching head: %w", err)
			}
		}
	}

	return nil
}

func futureNilAsChannel(f fdb.FutureNil) chan error {
	ch := make(chan error)

	go func() {
		defer close(ch)

		ch <- f.Get()
	}()

	return ch
}
