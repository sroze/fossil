package segments

import (
	"github.com/stretchr/testify/assert"
	"testing"
)

func Test_Prefix_Range(t *testing.T) {
	t.Run("it advertises the range as containing any stream with this prefix", func(t *testing.T) {
		r := NewPrefixRange("foo/")

		assert.True(t, r.Contains("foo/"))
		assert.True(t, r.Contains("foo/bar/"))
		assert.True(t, r.Contains("foo/123/baz"))
		assert.False(t, r.Contains("bar/"))
	})
}
