package segmentsstore

import (
	"context"
	"github.com/sroze/fossil/streamstore"
	"github.com/sroze/fossil/topology"
)

func (w *SegmentStore) Query(ctx context.Context, prefix string, startingPosition Position, ch chan QueryItem) {
	defer close(ch)
	segmentsToRead, err := w.locator.GetSegmentsToReadFrom(prefix)
	if err != nil || len(segmentsToRead) == 0 {
		ch <- streamstore.ReadItem{Error: err}
	}

	err = segmentsToRead.Walk(func(node topology.SegmentNode) error {
		w.ss.Read(ctx, segmentStream(node.Node), 0, ch)

		return nil
	})

	if err != nil {
		ch <- streamstore.ReadItem{Error: err}
	}
}
