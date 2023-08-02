package segmentplacement

import (
	"github.com/stretchr/testify/assert"
	"testing"
)

func Test_Topology(t *testing.T) {
	t.Run("it starts with a root span covering the whole range", func(t *testing.T) {
		topology := NewTopology()
		s, err := topology.GetSegmentToWriteInto("foo/abc")
		assert.Nil(t, err)
		assert.True(t, s.StreamRange.Contains("a"))
		assert.True(t, s.StreamRange.Contains("everything"))
		assert.True(t, s.StreamRange.Contains("z"))
	})

	t.Run("with a split segment", func(t *testing.T) {
		topology := NewTopology()
		rootSegment, err := topology.GetSegmentToWriteInto("foo/abc")
		assert.Nil(t, err)

		// 1. Split
		ranges := NewHashSplitRanges("", 2)
		segments := make([]Segment, len(ranges))
		for i, r := range ranges {
			segments[i] = NewSegment(r)
		}

		assert.Nil(t, topology.SplitSegment(rootSegment, segments))

		t.Run("it writes to the split ones", func(t *testing.T) {
			s, err := topology.GetSegmentToWriteInto("foo/abc")
			assert.Nil(t, err)
			assert.True(t, s.Id == segments[0].Id || s.Id == segments[1].Id, "the segment should be one of the two new segments")
		})

		t.Run("it reads from all of them", func(t *testing.T) {
			segments, err := topology.GetSegmentsToReadFrom("foo/abc")
			assert.Nil(t, err)
			assert.Equal(t, 2, segments.Count(), "there should be 2 segments")
			assert.True(t, segments[0].Node.Id == rootSegment.Id)
		})
	})

	t.Skip("TODO: merge segments")
}
