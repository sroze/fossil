package simplestore

import (
	"github.com/stretchr/testify/assert"
	"testing"
)

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

// Implement the three methods for sort.Interface.
