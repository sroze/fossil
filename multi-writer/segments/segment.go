package segments

import "github.com/google/uuid"

type Segment struct {
	Id          uuid.UUID
	StreamRange StreamRange
}

func NewSegment(r StreamRange) Segment {
	return Segment{
		Id:          uuid.New(),
		StreamRange: r,
	}
}
