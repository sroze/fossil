package topology

import (
	"github.com/sroze/fossil/segments"
	"github.com/stretchr/testify/assert"
	"golang.org/x/exp/maps"
	"testing"
)

func Test_Graph(t *testing.T) {
	t.Run("with a single segment that get replaced over time", func(t *testing.T) {
		// Given
		// a -> b -> c
		a := segments.NewSegment(segments.NewPrefixRange("f"))
		b := a.Replacement()
		c := b.Replacement()

		g := initialState
		g = Evolve(g, SegmentCreatedEvent{Segment: a})
		g = Evolve(g, SegmentReplacedEvent{SegmentId: a.Id, ReplacedBy: b})
		g = Evolve(g, SegmentReplacedEvent{SegmentId: b.Id, ReplacedBy: c})

		// Expects the last segment to be given for write
		s, err := g.GetSegmentToWriteInto("foo")
		assert.Nil(t, err)
		assert.Equal(t, c, s)

		// Expects all segments to be given for read
		d, err := g.GetSegmentsToReadFrom("foo")
		assert.Nil(t, err)
		assert.Equal(t, d.GetRoots(), g.d.GetRoots())

		assert.Equal(t, maps.Keys(d.GetRoots()), []string{a.ID()})
		descendants, err := d.GetOrderedDescendants(a.ID())
		assert.Nil(t, err)
		assert.Equal(t, descendants, []string{b.ID(), c.ID()})
	})

	t.Run("with multiple segments that get split over time", func(t *testing.T) {
		// Given
		// a ('foo') --> b (#1/1) --> c (#1/2)
		//    			          \-> d (#2/2)
		// e ('bar') --> f (#1/2)
		//           \-> g (#2/2) --> h (#1/3)
		//          			  \-> i (#2/3)
		//   				      \-> j (#3/3)
		a := segments.NewSegment(segments.NewPrefixRange("foo/"))
		b := a.Replacement()
		cAndd := b.Split(2)
		e := segments.NewSegment(segments.NewPrefixRange("bar/"))
		fAndg := e.Split(2)
		iAndiAndj := fAndg[1].Split(3)

		g := initialState
		g = Evolve(g, SegmentCreatedEvent{Segment: a})
		g = Evolve(g, SegmentReplacedEvent{SegmentId: a.Id, ReplacedBy: b})
		g = Evolve(g, SegmentSplitEvent{SegmentId: b.Id, Into: cAndd})
		g = Evolve(g, SegmentCreatedEvent{Segment: e})
		g = Evolve(g, SegmentSplitEvent{SegmentId: e.Id, Into: fAndg})
		g = Evolve(g, SegmentSplitEvent{SegmentId: fAndg[1].Id, Into: iAndiAndj})

		// Expects the last segments to be given for write
		s, err := g.GetSegmentToWriteInto("foo/bar")
		assert.Nil(t, err)
		assert.True(t, s.ID() == cAndd[1].ID() || s.ID() == cAndd[0].ID())

		s, err = g.GetSegmentToWriteInto("bar/baz")
		assert.Nil(t, err)
		assert.True(t, s.ID() == iAndiAndj[2].ID() || s.ID() == iAndiAndj[1].ID() || s.ID() == iAndiAndj[0].ID() || s.ID() == fAndg[0].ID())

		// Expects the relevant segments to be given for read
		d, err := g.GetSegmentsToReadFrom("foo/bar")
		assert.Nil(t, err)

		assert.Equal(t, maps.Keys(d.GetRoots()), []string{a.ID()})
		descendants, err := d.GetOrderedDescendants(a.ID())
		assert.Nil(t, err)
		assert.Equal(t, 2, len(descendants))
		assert.Equal(t, descendants[0], b.ID())
		assert.True(t, descendants[1] == cAndd[0].ID() || descendants[1] == cAndd[1].ID())

		d, err = g.GetSegmentsToReadFrom("bar/baz")
		assert.Nil(t, err)
		descendants, err = d.GetOrderedDescendants(e.ID())
		assert.Nil(t, err)
		assert.True(t, len(descendants) == 1 || len(descendants) == 4)
	})
}
