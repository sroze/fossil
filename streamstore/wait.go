package streamstore

import (
	"context"
	"fmt"
	"github.com/apple/foundationdb/bindings/go/src/fdb"
)

type watchHeadResult struct {
	HeadPosition int64
	Future       fdb.FutureNil
}

func (ss FoundationDBStore) WaitForEvent(ctx context.Context, stream string, currentPosition int64) error {
	headKey := headInStreamKey(stream)

	// Watch the head for a change. We'll validate that _current_ position is not different from the
	// one currently expected.
	result, err := ss.db.Transact(func(t fdb.Transaction) (interface{}, error) {
		headPosition := int64(0)
		head := t.Get(headKey).MustGet()
		if head != nil {
			headPosition = positionFromByteArray(head)
		}

		return watchHeadResult{
			HeadPosition: headPosition,
			Future:       t.Watch(headKey),
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
