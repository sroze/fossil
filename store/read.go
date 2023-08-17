package store

import (
	"context"
	"github.com/google/uuid"
	"github.com/heimdalr/dag"
	"github.com/sroze/fossil/simplestore"
	"github.com/sroze/fossil/store/topology"
	"sync"
)

func (s *Store) Read(ctx context.Context, stream string, ch chan simplestore.ReadItem, options simplestore.ReadOptions) {
	segments, err := s.locator.GetSegmentsToReadFromStream(stream)
	if err != nil {
		ch <- simplestore.ReadItem{Error: err}
		return
	}

	// TODO: trim the list of segments through a bloom filter on the closed segments.

	// We have a 'centralised' aggregator that receives events from the segments and sends them to the channel.
	// This is where we handle the limit.
	walkerCtx, cancelWalk := context.WithCancel(ctx)
	aggregator := make(chan simplestore.ReadItem)
	wg := sync.WaitGroup{}
	wg.Add(1)

	go func() {
		defer close(ch)
		defer wg.Done()

		count := 0
		for item := range aggregator {
			ch <- item
			count++

			if options.Limit > 0 && count >= options.Limit {
				cancelWalk()
				break
			}
		}
	}()

	// Walk the DAG forward to provide an ordered view of the events.
	walker := func(segmentId dag.IDInterface) error {
		segmentStore := s.storeForSegment(uuid.MustParse(segmentId.ID()))
		segmentCh := make(chan simplestore.ReadItem)
		go segmentStore.Read(ctx, stream, segmentCh, options)

		for item := range segmentCh {
			aggregator <- item

			select {
			case <-walkerCtx.Done():
				break
			default:
			}
		}

		return nil
	}

	// TODO: handle `limit`.
	if options.Backwards {
		err = topology.WalkBackwardsDag(walkerCtx, segments, walker)
	} else {
		err = topology.WalkForwardDag(segments, walker)
	}

	close(aggregator)
	wg.Wait()

	if err != nil {
		ch <- simplestore.ReadItem{Error: err}
		return
	}
}
