package api

import (
	"github.com/apple/foundationdb/bindings/go/src/fdb/subspace"
	"github.com/stretchr/testify/assert"
	"sort"
	"testing"
)

func Test_EventRow(t *testing.T) {
	t.Run("it can encode and decode an event row", func(t *testing.T) {
		row := EventRow{
			EventId:   "123",
			EventType: "Foo",
			Payload:   []byte("payload"),
		}

		encoded, err := EncodeEventRow(row)
		if err != nil {
			t.Error(err)
		}

		decoded, err := DecodeEventRow(encoded)
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
}

func Test_EventInStreamKey(t *testing.T) {
	t.Run("is binary order preserving", func(t *testing.T) {
		s1 := subspace.Sub("stream", "a")
		s2 := subspace.Sub("stream", "b")

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
