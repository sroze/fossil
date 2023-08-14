package topology

import (
	"github.com/google/uuid"
	"github.com/sroze/fossil/segments"
	"github.com/stretchr/testify/assert"
	"golang.org/x/exp/maps"
	"testing"
)

func Test_Position(t *testing.T) {
	// Given
	// - a ('foo') --> b ('foo')
	// - c ('bar') --> d (#1/2)
	//             \-> e (#2/2) --> f (#1/2)
	//                          \-> g (#2/2)
	a := segments.NewSegment(segments.NewPrefixRange("foo/"))
	b := a.Replacement()
	c := segments.NewSegment(segments.NewPrefixRange("bar/"))
	dAndE := c.Split(2)
	fAndG := dAndE[1].Split(2)

	g := initialGraphState()
	g = EvolveGraphState(g, &SegmentCreatedEvent{Segment: a})
	g = EvolveGraphState(g, &SegmentReplacedEvent{SegmentId: a.Id, ReplacedBy: b})
	g = EvolveGraphState(g, &SegmentCreatedEvent{Segment: c})
	g = EvolveGraphState(g, &SegmentSplitEvent{SegmentId: c.Id, Into: dAndE})
	g = EvolveGraphState(g, &SegmentSplitEvent{SegmentId: dAndE[1].Id, Into: fAndG})

	t.Run("it filters out segments past the position", func(t *testing.T) {
		p := Position{Cursors: map[uuid.UUID]int64{
			b.Id:        1,
			dAndE[1].Id: 130,
		}}

		// Expects to see:
		// - b ('foo')
		// - d ('bar' & #1/2)
		// - e ('bar' & #2/2) --> f (#1/2)
		//                    \-> g (#2/2)
		//

		trimed := p.TrimForRemaining(g.d)
		vertices := maps.Keys(trimed.GetVertices())

		assert.Equal(t, 5, len(vertices))

		// `a` is filtered out because it's before `b`
		assert.NotContains(t, vertices, a.ID())
		// `c` is filtered out because it's before `e` which is before `g`
		assert.NotContains(t, vertices, c.ID())

		// Contains the expected vertices
		assert.Contains(t, vertices, b.ID())
		assert.Contains(t, vertices, dAndE[0].ID())
		assert.Contains(t, vertices, dAndE[1].ID())
		assert.Contains(t, vertices, fAndG[0].ID())
		assert.Contains(t, vertices, fAndG[1].ID())
	})

	t.Run("it filter nothing out with an empty position", func(t *testing.T) {
		p := NewPosition()
		trimed := p.TrimForRemaining(g.d)

		assert.Equal(t, g.d, trimed)
	})

	t.Run("it provides the starting position, given a particular segment", func(t *testing.T) {
		p := Position{Cursors: map[uuid.UUID]int64{
			b.Id:        1,
			dAndE[0].Id: 2,
			fAndG[0].Id: 3,
		}}

		assert.Equal(t, int64(0), p.PositionInSegment(a.Id))
		assert.Equal(t, int64(1), p.PositionInSegment(b.Id))
		assert.Equal(t, int64(2), p.PositionInSegment(dAndE[0].Id))
		assert.Equal(t, int64(3), p.PositionInSegment(fAndG[0].Id))
		assert.Equal(t, int64(0), p.PositionInSegment(fAndG[1].Id))
	})

	t.Run("it can be serialized and deserialized", func(t *testing.T) {
		p := &Position{Cursors: map[uuid.UUID]int64{
			b.Id:        12,
			dAndE[0].Id: 34,
			fAndG[1].Id: 56,
			a.Id:        0,
		}}

		deserialized, err := NewPositionFromSerialized(p.Serialize())
		assert.Nil(t, err)
		assert.Equal(t, p, deserialized)

		empty, err := NewPositionFromSerialized("0")
		assert.Nil(t, err)
		assert.Equal(t, NewPosition(), empty)
	})

	t.Run("it advances the position", func(t *testing.T) {
		p := NewPosition()
		err := p.AdvanceTo(g.d, a.Id, 10)
		assert.Nil(t, err)

		// We expect mutations to be done in place.
		assert.Equal(t, int64(10), p.PositionInSegment(a.Id))

		// We expect ancestors to be removed
		err = p.AdvanceTo(g.d, b.Id, 2)
		assert.Nil(t, err)
		assert.Equal(t, int64(2), p.PositionInSegment(b.Id))
		assert.Equal(t, int64(0), p.PositionInSegment(a.Id))
	})

	t.Run("cloned positions are independent", func(t *testing.T) {
		p := NewPosition()
		assert.Nil(t, p.AdvanceTo(g.d, a.Id, 10))
		assert.Equal(t, int64(10), p.PositionInSegment(a.Id))

		p2 := p.Clone()
		assert.Nil(t, p2.AdvanceTo(g.d, a.Id, 12))
		assert.Equal(t, int64(10), p.PositionInSegment(a.Id))
		assert.Equal(t, int64(12), p2.PositionInSegment(a.Id))
	})
}
