package multi_writer

import (
	"context"
	"github.com/sroze/fossil/multi-writer/segments"
	"github.com/sroze/fossil/streamstore"
)

type Reader struct {
	ss      streamstore.Store
	locator segments.SegmentLocator
}

func NewReader(ss streamstore.Store, locator segments.SegmentLocator) *Reader {
	return &Reader{
		ss:      ss,
		locator: locator,
	}
}

func (r *Reader) Read(ctx context.Context, prefix string, ch chan streamstore.ReadItem) {
	defer close(ch)
	segmentsToRead, err := r.locator.GetSegmentsToReadFrom(prefix)
	if err != nil || len(segmentsToRead) == 0 {
		ch <- streamstore.ReadItem{Error: err}
	}

	err = segmentsToRead.Walk(func(node segments.SegmentNode) error {
		r.ss.Read(ctx, segmentStream(node.Node), 0, ch)

		return nil
	})

	if err != nil {
		ch <- streamstore.ReadItem{Error: err}
	}
}
