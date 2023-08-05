package segments

import "github.com/google/uuid"

type SegmentSplitEvent struct {
	SplitSegmentId uuid.UUID
	Into           []Segment
}

type SegmentCreatedEvent struct {
	Segment Segment
}

type SegmentAllocatedEvent struct {
	SegmentId uuid.UUID
	NodeId    uuid.UUID
}
