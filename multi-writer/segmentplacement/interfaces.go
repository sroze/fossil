package segmentplacement

// In Fossil, the store is split into smaller chucks:
//
// 1. Segments.
//    They own a subset of the stream range.
//    They are the unit of horizontal scaling: each of them as a dedicated writer and those maximum throughput.
//    As specific subsets of stream get more traffic, we should add more shards to the store.

type TopologyReader interface {
	// For a given stream, return the current active segment to write into.
	GetSegmentToWriteInto(stream string) (Segment, error)

	// For a given stream prefix (e.g. "user-"), return the list of segments to read from.
	GetSegmentsToReadFrom(streamPrefix string) (SegmentNodes, error)
}

type TopologyManager interface {
	// Split a shard into small pieces.
	SplitSegment(segment Segment, into []Segment) error

	// Merge two shards into one.
	MergeSegments(segments []Segment, into Segment) error
}
