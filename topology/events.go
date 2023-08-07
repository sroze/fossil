package topology

import (
	"github.com/google/uuid"
	"github.com/sroze/fossil/segments"
)

type SegmentCreatedEvent struct {
	Segment segments.Segment
}

type SegmentReplacedEvent struct {
	SegmentId  uuid.UUID
	ReplacedBy segments.Segment
}

type SegmentSplitEvent struct {
	SegmentId uuid.UUID
	Into      []segments.Segment
}

type SegmentMergedEvent struct {
	Segments []uuid.UUID
	Into     segments.Segment
}

// @deprecated -- we need to remove this event
type SegmentAllocatedEvent struct {
	SegmentId uuid.UUID
	NodeId    uuid.UUID
}
