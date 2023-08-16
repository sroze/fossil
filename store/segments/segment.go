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

func (s Segment) ID() string {
	return s.Id.String()
}

func (s Segment) Split(count int) []Segment {
	segments := make([]Segment, count)
	hashRanges := NewHashSplitRanges(count)

	for i := 0; i < count; i++ {
		segments[i] = NewSegment(
			NewComposedRange(
				s.StreamRange,
				hashRanges[i],
			),
		)
	}

	return segments
}

func (s Segment) Replacement() Segment {
	return NewSegment(s.StreamRange)
}
