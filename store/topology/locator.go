package topology

import (
	"github.com/heimdalr/dag"
	"github.com/sroze/fossil/store/segments"
)

// In Fossil, the store is split into smaller chucks:
//
// 1. Segments.
//    They own a subset of the stream range.
//    They are the unit of horizontal scaling: each of them as a dedicated writer and those maximum throughput.
//    As specific subsets of stream get more traffic, we should add more shards to the store.

type SegmentLocator interface {
	// For a given stream, return the current active segments to write into.
	GetSegmentToWriteInto(stream string) (segments.Segment, error)

	// For a given stream prefix (e.g. "user-"), return the list of segments to read from.
	GetSegmentsToReadFrom(streamPrefix string) (*dag.DAG, error)
}
