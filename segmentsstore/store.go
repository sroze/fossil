package segmentsstore

import (
	"github.com/google/uuid"
	"github.com/sroze/fossil/eskit"
	multi_writer "github.com/sroze/fossil/multi-writer"
	"github.com/sroze/fossil/streamstore"
	"github.com/sroze/fossil/topology"
)

type SegmentStore struct {
	// Internal matters.
	rw            *eskit.ReaderWriter
	ss            streamstore.Store
	locator       topology.SegmentLocator
	segmentCursor map[uuid.UUID]int64
}

func NewSegmentStore(
	ss streamstore.Store,
	locator topology.SegmentLocator,
) *SegmentStore {
	return &SegmentStore{
		ss:            ss,
		locator:       locator,
		segmentCursor: map[uuid.UUID]int64{},
		rw: eskit.NewReaderWriter(
			ss,
			multi_writer.RootCodec,
		),
	}
}

// TODO: implement read-through methods from streamstore.Store.
