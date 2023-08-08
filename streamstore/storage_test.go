package streamstore

import (
	"github.com/stretchr/testify/assert"
	"sort"
	"testing"
)

func Test_ReverseEventInStreamKey(t *testing.T) {
	t.Run("a key can be reversed", func(t *testing.T) {
		stream, position, err := ReverseEventInStreamKey(
			EventInStreamKey("foo/bar", 12).FDBKey(),
		)

		assert.Nil(t, err)
		assert.Equal(t, "foo/bar", stream)
		assert.Equal(t, int64(12), position)
	})
}
func Test_EventRow(t *testing.T) {
	t.Run("it can encode and decode an event row with no metadata", func(t *testing.T) {
		row := Event{
			EventId:   "123",
			EventType: "Foo",
			Payload:   []byte("payload"),
		}

		encoded, err := EncodeEvent(row)
		if err != nil {
			t.Error(err)
		}

		decoded, err := DecodeEvent(encoded)
		if err != nil {
			t.Error(err)
		}

		if decoded.EventId != row.EventId {
			t.Errorf("Expected EventId to be %s, got %s", row.EventId, decoded.EventId)
		}

		if decoded.EventType != row.EventType {
			t.Errorf("Expected EventType to be %s, got %s", row.EventType, decoded.EventType)
		}

		if string(decoded.Payload) != string(row.Payload) {
			t.Errorf("Expected Payload to be %s, got %s", row.Payload, decoded.Payload)
		}
	})

	t.Run("it can encode and decode an event row with metadata", func(t *testing.T) {
		row := Event{
			EventId:   "123",
			EventType: "Foo",
			Payload:   []byte("payload"),
			Metadata: map[string]string{
				"foo": "bar",
				"123": "456",
			},
		}

		encoded, err := EncodeEvent(row)
		if err != nil {
			t.Error(err)
		}

		decoded, err := DecodeEvent(encoded)
		if err != nil {
			t.Error(err)
		}

		assert.Equal(t, row.Metadata, decoded.Metadata)
	})
}

func Test_EventInStreamKey(t *testing.T) {
	t.Run("is binary order preserving", func(t *testing.T) {
		s1 := "foo/a"
		s2 := "foo/b"

		items := [][]byte{
			EventInStreamKey(s1, 12).FDBKey(),
			EventInStreamKey(s2, 2).FDBKey(),
			EventInStreamKey(s1, 1).FDBKey(),
		}

		sort.Sort(byteSlices(items))

		assert.Equal(t, items[0], []byte(EventInStreamKey(s1, 1).FDBKey()))
		assert.Equal(t, items[1], []byte(EventInStreamKey(s1, 12).FDBKey()))
		assert.Equal(t, items[2], []byte(EventInStreamKey(s2, 2).FDBKey()))
	})
}

// Define a type for a slice of byte slices.
type byteSlices [][]byte

// Implement the three methods for sort.Interface.

func (b byteSlices) Len() int {
	return len(b)
}

func (b byteSlices) Less(i, j int) bool {
	for x := 0; x < len(b[i]) && x < len(b[j]); x++ {
		if b[i][x] == b[j][x] {
			continue
		}
		return b[i][x] < b[j][x]
	}
	return len(b[i]) < len(b[j]) // In case all bytes are equal, the shorter length should be considered less.
}

func (b byteSlices) Swap(i, j int) {
	b[i], b[j] = b[j], b[i]
}
