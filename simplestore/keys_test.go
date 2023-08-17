package simplestore

import (
	"github.com/sroze/fossil/kv"
	"github.com/stretchr/testify/assert"
	"sort"
	"testing"
)

func Test_StreamIndexEventKey(t *testing.T) {
	factory := StreamIndexEventKeyFactory{keySpace: []byte("Foo")}

	t.Run("encode and decode", func(t *testing.T) {
		testCases := []struct {
			name     string
			stream   string
			position int64
		}{
			{
				name:     "with simple stream name",
				stream:   "Bar",
				position: 42,
			},
			{
				name:     "with stream name containing slashes",
				stream:   "Foo/Bar",
				position: 0,
			},
		}

		for _, tc := range testCases {
			t.Run(tc.name, func(t *testing.T) {
				decodedStream, decodedPosition, err := factory.Reverse(factory.Bytes(tc.stream, tc.position))
				assert.Nil(t, err)
				assert.Equal(t, tc.stream, decodedStream)
				assert.Equal(t, tc.position, decodedPosition)
			})
		}
	})

	t.Run("error reversing other keys", func(t *testing.T) {
		keysItShouldFailFor := [][]byte{
			[]byte("Foo"),
			[]byte("Foo/s/foobar/12"),
			[]byte("Bar/baz"),
		}

		for _, key := range keysItShouldFailFor {
			_, _, err := factory.Reverse(key)
			assert.NotNil(t, err)
		}
	})

	t.Run("is (binary) ordered", func(t *testing.T) {
		bytes := [][]byte{
			factory.Bytes("Foo/Bar/10", 1),
			factory.Bytes("Foo/Bar/2", 123),
			factory.Bytes("Bar/1234", 0),
			factory.Bytes("Foo/Bar/10", 12),
		}

		sort.Sort(kv.ByteSlices(bytes))

		assert.Equal(t, bytes[0], factory.Bytes("Bar/1234", 0))
		assert.Equal(t, bytes[1], factory.Bytes("Foo/Bar/10", 1))
		assert.Equal(t, bytes[2], factory.Bytes("Foo/Bar/10", 12))
		assert.Equal(t, bytes[3], factory.Bytes("Foo/Bar/2", 123))
	})
}

func Test_PositionIndexedEventKey(t *testing.T) {
	factory := PositionIndexedEventKeyFactory{keySpace: []byte("Foo")}

	t.Run("encode and decode", func(t *testing.T) {
		testCases := []struct {
			name     string
			position int64
		}{
			{
				name:     "with random position",
				position: 42,
			},
			{
				name:     "with a 0 position",
				position: 0,
			},
		}

		for _, tc := range testCases {
			t.Run(tc.name, func(t *testing.T) {
				decodedPosition, err := factory.Reverse(factory.Bytes(tc.position))
				assert.Nil(t, err)
				assert.Equal(t, tc.position, decodedPosition)
			})
		}
	})

	t.Run("error reversing other keys", func(t *testing.T) {
		keysItShouldFailFor := [][]byte{
			[]byte("Foo"),
			[]byte("Foo/e/"),
			[]byte("Foo/e/42"), // we need 8 bytes for the position.
		}

		for _, key := range keysItShouldFailFor {
			_, err := factory.Reverse(key)
			assert.NotNil(t, err)
		}
	})
}
