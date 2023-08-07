package segments

import (
	"github.com/stretchr/testify/assert"
	"math/rand"
	"testing"
)

func Test_Segment_Replacement(t *testing.T) {
	t.Run("replace a simple prefixed segment", func(t *testing.T) {
		s := NewSegment(NewPrefixRange("foo/"))
		r := s.Replacement()

		assert.Equal(t, s.StreamRange, r.StreamRange)
	})

	t.Run("replaces a hashed segment", func(t *testing.T) {
		s := NewSegment(NewHashSplitRanges(2)[0])
		r := s.Replacement()

		assert.Equal(t, s.StreamRange, r.StreamRange)
	})
}

func Test_Segment_Split(t *testing.T) {
	t.Run("it splits a simple prefixed segment", func(t *testing.T) {
		s := NewSegment(NewPrefixRange("foo/"))
		splitSegments := s.Split(2)

		assert.Equal(t, 2, len(splitSegments))

		// Split segments should contain the original segment's prefix.
		assert.False(t, splitSegments[0].StreamRange.Contains("bar/"))
		assert.False(t, splitSegments[1].StreamRange.Contains("bar/"))

		// Generate a number of streams and measure distribution between segmenrts.
		distribution := sampleStreamDistribution(splitSegments, 1000, func() string {
			return "foo/" + RandString(10)
		})

		// Expect the distribution to be roughly equal, within `foo/`
		assert.True(t, distribution[splitSegments[0].ID()] > 400 && distribution[splitSegments[0].ID()] < 600)
		assert.True(t, distribution[splitSegments[0].ID()] > 400 && distribution[splitSegments[0].ID()] < 600)

		// Expect the total distribution to be 100%
		assert.Equal(t, 1000, distribution[splitSegments[0].ID()]+distribution[splitSegments[1].ID()])
	})

	t.Run("splits a hashed segment again", func(t *testing.T) {
		// Given
		// a ('') --> b (#1/1)
		//    	  \-> c (#2/2) --> d (#1/3)
		//    	  			   \-> e (#2/3)
		//    	  			   \-> f (#3/3)
		a := NewSegment(NewPrefixRange(""))
		splitSegments := a.Split(2)
		b, c := splitSegments[0], splitSegments[1]
		splitSegments = append(splitSegments, c.Split(3)...)
		d, e, f := splitSegments[2], splitSegments[3], splitSegments[4]

		// The distribution should be 50% to `b` and 50% to `c`'s children (`d`, `e`, `f`)
		distribution := sampleStreamDistribution([]Segment{b, d, e, f}, 1000, func() string {
			return RandString(10)
		})

		assert.True(t, distribution[b.ID()] > 400 && distribution[b.ID()] < 600)
		assert.True(t, distribution[d.ID()] > 100 && distribution[d.ID()] < 300)
		assert.True(t, distribution[e.ID()] > 100 && distribution[e.ID()] < 300)
		assert.True(t, distribution[f.ID()] > 100 && distribution[f.ID()] < 300)

		// The total distribution should be 100%
		assert.Equal(t, 1000, distribution[b.ID()]+distribution[d.ID()]+distribution[e.ID()]+distribution[f.ID()])
	})
}

func sampleStreamDistribution(
	segments []Segment,
	samples int,
	streamGenerator func() string,
) map[string]int {
	distribution := make(map[string]int)

	for i := 0; i < samples; i++ {
		stream := streamGenerator()

		for _, splitSegment := range segments {
			if splitSegment.StreamRange.Contains(stream) {
				distribution[splitSegment.ID()]++
			}
		}
	}

	return distribution
}

var letterRunes = []rune("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ")

func RandString(n int) string {
	b := make([]rune, n)
	for i := range b {
		b[i] = letterRunes[rand.Intn(len(letterRunes))]
	}
	return string(b)
}
