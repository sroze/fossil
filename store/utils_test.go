package store

import (
	"github.com/sroze/fossil/simplestore"
	"github.com/stretchr/testify/assert"
	"testing"
)

func Test_mergeCommandsPerStream(t *testing.T) {
	t.Run("merge two compatible commands", func(t *testing.T) {
		merged, err := mergeCommandsPerStream([]simplestore.AppendToStream{
			{
				Stream: "foo",
				Events: []simplestore.Event{
					{EventId: "1", EventType: "Foo", Payload: []byte("foo")},
				},
			},
			{
				Stream: "bar",
				Events: []simplestore.Event{
					{EventId: "2", EventType: "Bar", Payload: []byte("bar")},
				},
			},
			{
				Stream: "foo",
				Events: []simplestore.Event{
					{EventId: "2", EventType: "Bar", Payload: []byte("bar")},
				},
			},
		})

		assert.Nil(t, err)
		assert.Equal(t, []simplestore.AppendToStream{
			{
				Stream: "foo",
				Events: []simplestore.Event{
					{EventId: "1", EventType: "Foo", Payload: []byte("foo")},
					{EventId: "2", EventType: "Bar", Payload: []byte("bar")},
				},
			},
			{
				Stream: "bar",
				Events: []simplestore.Event{
					{EventId: "2", EventType: "Bar", Payload: []byte("bar")},
				},
			},
		}, merged)
	})
}
