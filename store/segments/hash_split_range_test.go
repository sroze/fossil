package segments

import (
	"github.com/stretchr/testify/assert"
	"testing"
)

func Test_HashSplitRange(t *testing.T) {
	seed := []byte{103, 209, 5, 73, 57, 54, 233, 52}

	t.Run("will consistently assign the same stream to the same sub-range", func(t *testing.T) {
		ranges := NewHashSplitRangesWithSeed(2, seed)

		assert.True(t, ranges[0].ContainsStream("bar/baz"))
		assert.True(t, ranges[0].ContainsStream("bar/baz"))
		assert.False(t, ranges[1].ContainsStream("bar/baz"))

		assert.True(t, ranges[1].ContainsStream("foo/bar"))
		assert.True(t, ranges[1].ContainsStream("foo/bar"))
		assert.False(t, ranges[0].ContainsStream("foo/bar"))
	})
}
