package multi_writer

import (
	"context"
	"github.com/google/uuid"
	v1 "github.com/sroze/fossil/api/v1"
	"github.com/sroze/fossil/eskit"
	"github.com/sroze/fossil/multi-writer/segments"
	"github.com/sroze/fossil/streamstore"
	"github.com/stretchr/testify/assert"
	"testing"
)

func Test_Reader(t *testing.T) {
	t.Run("reads a segment in order, across multiple streams", func(t *testing.T) {
		locator := segments.NewGraphProjectionWithEvents([]interface{}{
			segments.SegmentCreatedEvent{
				Segment: segments.Segment{
					Id:          uuid.New(),
					StreamRange: segments.NewHashSplitRanges("", 1)[0],
				},
			},
		})

		ss := eskit.NewInMemoryStore()
		w := NewWriter(ss, locator)

		requests := []v1.AppendRequest{
			{
				StreamName: "foo/" + uuid.NewString(),
				EventId:    uuid.NewString(),
				EventType:  "AnEvent",
				Payload:    []byte("foo"),
			}, {
				StreamName: "foo/" + uuid.NewString(),
				EventId:    uuid.NewString(),
				EventType:  "AnEvent",
				Payload:    []byte("foo"),
			},
		}

		for _, request := range requests {
			_, err := w.Write(&request)
			assert.Nil(t, err)
		}

		// Do read
		r := NewReader(ss, locator)
		ch := make(chan streamstore.ReadItem, 10)
		go r.Read(context.Background(), "foo/", ch)

		var items []streamstore.ReadItem
		for item := range ch {
			items = append(items, item)
		}

		// Assert that events are in order
		assert.Len(t, items, 2)
		assert.Equal(t, requests[0].EventId, items[0].EventInStream.Event.EventId)
		assert.Equal(t, requests[1].EventId, items[1].EventInStream.Event.EventId)
	})

	//t.Run("read from multiple segments, one after the other", func(t *testing.T) {
	//	locator := segments.NewGraphProjectionWithEvents([]interface{}{
	//		segments.SegmentCreatedEvent{
	//			Segment: segments.Segment{
	//				Id: uuid.New(),
	//				StreamRange: segments.NewHashSplitRanges("", 1)[0],
	//			},
	//		},
	//		segments.SegmentSplitEvent{
	//			SplitSegmentId: uuid.UUID{},
	//			Into:           nil,
	//		},
	//	})
	//
	//	ss := eskit.NewInMemoryStore()
	//	w := NewWriter(ss, locator)
	//
	//	requests := []v1.AppendRequest{
	//		{
	//			StreamName: "foo/2/" + uuid.NewString(),
	//			EventId:    uuid.NewString(),
	//			EventType:  "AnEvent",
	//			Payload:    []byte("foo"),
	//		}, {
	//			StreamName: "foo/1/" + uuid.NewString(),
	//			EventId:    uuid.NewString(),
	//			EventType:  "AnEvent",
	//			Payload:    []byte("foo"),
	//		},
	//	}
	//
	//	for _, request := range requests {
	//		_, err := w.Write(&request)
	//		assert.Nil(t, err)
	//	}
	//
	//	// Do read
	//	r := NewReader(ss, locator)
	//	ch := make(chan streamstore.ReadItem, 10)
	//	go r.Read(context.Background(), "foo/", ch)
	//
	//	var items []streamstore.ReadItem
	//	for item := range ch {
	//		items = append(items, item)
	//	}
	//
	//	// Assert that events are in order
	//	assert.Len(t, items, 2)
	//	assert.Equal(t, requests[0].EventId, items[0].EventInStream.Event.EventId)
	//	assert.Equal(t, requests[1].EventId, items[1].EventInStream.Event.EventId)
	//})

	t.Skip("TODO: positioning cursor")
}
