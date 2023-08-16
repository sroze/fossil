package kv

import (
	"github.com/stretchr/testify/assert"
	"testing"
)

func Test_ConcatBytes(t *testing.T) {
	t.Run("concatenates bytes", func(t *testing.T) {
		concat := ConcatBytes([]byte("foo"), []byte("bar"))
		assert.Equal(t, []byte("foobar"), concat)
	})
}

func Test_SplitBytes(t *testing.T) {
	t.Run("splits bytes", func(t *testing.T) {
		tuples := SplitBytes([]byte("foo/bar"), []byte("/"))
		assert.Equal(t, [][]byte{[]byte("foo"), []byte("bar")}, tuples)
	})
}
