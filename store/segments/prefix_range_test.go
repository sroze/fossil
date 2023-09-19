package segments

import (
	"github.com/stretchr/testify/assert"
	"testing"
)

func Test_Prefix_Range(t *testing.T) {
	t.Run("it advertises the range as containing any stream with this prefix", func(t *testing.T) {
		r := NewPrefixRange("foo/")

		assert.True(t, r.ContainsStream("foo/"))
		assert.True(t, r.ContainsStream("foo/bar/"))
		assert.True(t, r.ContainsStream("foo/123/baz"))
		assert.False(t, r.ContainsStream("bar/"))
		assert.False(t, r.ContainsStream("fo"))
		assert.False(t, r.ContainsStream("fo/bar"))

		assert.True(t, r.ContainsStreamPrefixedWith("fo"))
		assert.True(t, r.ContainsStreamPrefixedWith("foo/"))
		assert.True(t, r.ContainsStreamPrefixedWith("foo/bar"))
		assert.False(t, r.ContainsStreamPrefixedWith("bar/"))
	})
}
