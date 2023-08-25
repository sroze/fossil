package simplestore

import (
	"context"
	"github.com/apple/foundationdb/bindings/go/src/fdb"
	"github.com/google/uuid"
	"github.com/sroze/fossil/kv/foundationdb"
	"github.com/stretchr/testify/assert"
	"testing"
)

func Test_Query(t *testing.T) {
	fdb.MustAPIVersion(720)
	s := NewStore(
		foundationdb.NewStore(fdb.MustOpenDatabase("../fdb.cluster")),
		uuid.NewString(),
	)

	fooWriteRequests, eventsPerStream := GenerateEventWriteRequests(10, 20, "foo/")
	barWriteRequests, _ := GenerateEventWriteRequests(10, 20, "bar/")
	_, err := s.Write(context.Background(), append(fooWriteRequests, barWriteRequests...))
	assert.Nil(t, err)

	t.Run("returns events across streams in order", func(t *testing.T) {
		ch := make(chan QueryItem)
		go s.Query(context.Background(), "foo", 0, ch)

		// Expects all the events to be streamed.
		collectedEventsPerStream := make(map[string][]string)
		collectQueryItemsPerStreamInto(collectedEventsPerStream, ch)

		assert.Equal(t, eventsPerStream, collectedEventsPerStream)
	})
}

func collectQueryItemsPerStreamInto(target map[string][]string, ch chan QueryItem) {
	for item := range ch {
		if item.EventInStream != nil {
			target[item.EventInStream.Stream] = append(target[item.EventInStream.Stream], item.EventInStream.Event.EventId)
		}
	}
}
