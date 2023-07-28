package store

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
func (s FoundationDBStore) WaitForEvent(ctx context.Context, stream string, currentPosition uint64) error {
	headKey := headInStreamKey(stream)

	// Watch the head for a change. We'll validate that _current_ position is not different from the
	// one currently expected.
	result, err := s.db.Transact(func(t fdb.Transaction) (interface{}, error) {
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
	if watchResult.HeadPosition != currentPosition {
		fmt.Println("Head changed between watching and last scan, let's read again!")
	} else {
		// FIXME: uses the `context` to cancel the watch.
		err := watchResult.Future.Get()

		if err != nil {
			return fmt.Errorf("error while watching head: %w", err)
		}
	}

	return nil
}
