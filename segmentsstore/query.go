package segmentsstore

import (
	"context"
	"github.com/heimdalr/dag"
	"github.com/sroze/fossil/streamstore"
	"github.com/sroze/fossil/topology"
)

func (w *SegmentStore) Query(ctx context.Context, prefix string, startingPosition Position, ch chan QueryItem) {
	defer close(ch)
	segmentsToRead, err := w.locator.GetSegmentsToReadFrom(prefix)

	if err != nil {
		ch <- QueryItem{Error: err}
	}

	err = topology.FlowThroughDag(segmentsToRead, func(segment dag.IDInterface) error {
		segmentCh := make(chan streamstore.ReadItem)
		go w.ss.Read(ctx, segmentStream(segment.ID()), 0, segmentCh)

		for item := range segmentCh {
			if item.Error != nil {
				return item.Error
			}

			if item.EventInStream != nil {
				stream, err := GetStreamFromMetadata(item.EventInStream.Event)
				if err != nil {
					return err
				}

				if stream[:len(prefix)] != prefix {
					continue
				}

				ch <- QueryItem{
					EventInStream: &EventInStore{
						Event:  item.EventInStream.Event,
						Stream: stream,
					},
				}
			}

			if item.EndOfStreamSignal != nil {
				// TODO: this would mean it's the end of the segment.
				// 		 (when subscribing, we'll have to differentiate between closed and open ones)
			}
		}

		return nil
	})

	if err != nil {
		ch <- QueryItem{Error: err}
	}
}
