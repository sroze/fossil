package segments

import (
	"github.com/stretchr/testify/assert"
	"testing"
)

func Test_Composed_Range(t *testing.T) {
	t.Run("with 2 prefixes", func(t *testing.T) {
		r := NewComposedRange(
			NewPrefixRange("foo/"),
			NewPrefixRange("foo/bar/"),
		)

		t.Run("it contains a stream if all constraints match", func(t *testing.T) {
			assert.True(t, r.ContainsStream("foo/bar/"))
			assert.True(t, r.ContainsStream("foo/bar/baz"))
			assert.False(t, r.ContainsStream("foo/"))
			assert.False(t, r.ContainsStream("bar/"))
		})
	})

	t.Run("with a prefix and 2 hash ranges", func(t *testing.T) {
		r := NewComposedRange(
			NewPrefixRange("foo/"),
			NewHashSplitRangesWithSeed(2, []byte{1})[1],
		)

		t.Run("it contains a stream if all constraints match", func(t *testing.T) {
			assert.True(t, r.ContainsStream("foo/1/"))
			assert.False(t, r.ContainsStream("foo/2/"))
			assert.False(t, r.ContainsStream("bar/1/"))
			assert.False(t, r.ContainsStream("bar/2/"))
		})

		t.Run("it contains stream prefixed regardless of the hash", func(t *testing.T) {
			assert.True(t, r.ContainsStreamPrefixedWith("f"))
			assert.True(t, r.ContainsStreamPrefixedWith("foo/1/"))
			assert.True(t, r.ContainsStreamPrefixedWith("foo/2/"))
			assert.False(t, r.ContainsStreamPrefixedWith("bar/1/"))
			assert.False(t, r.ContainsStreamPrefixedWith("bar/2/"))
		})
	})
}
