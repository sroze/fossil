package multi_writer

import (
	"github.com/google/uuid"
	v1 "github.com/sroze/fossil/store/api/v1"
	"github.com/sroze/fossil/store/eskit"
	"github.com/sroze/fossil/store/multi-writer/segments"
	"github.com/stretchr/testify/assert"
	"testing"
)

func Test_Writer(t *testing.T) {
	segmentA := segments.Segment{
		Id:          uuid.New(),
		StreamRange: segments.NewHashSplitRanges("", 1)[0],
	}

	locator := segments.NewGraphProjectionWithEvents([]interface{}{
		segments.SegmentCreatedEvent{
			Segment: segmentA,
		},
	})

	//stream := "foo/" + uuid.NewString()
	w := NewWriter(
		eskit.NewInMemoryStore(),
		//stream,
		locator,
		//nodeId,
	)

	// Prepare existing state
	//_, err := w.rw.Write([]eskit.EventToWrite{
	//	{Stream: stream, Event: segments.SegmentAllocatedEvent{
	//		NodeId:    nodeId,
	//		SegmentId: segmentA.Id,
	//	}},
	//})
	//assert.Nil(t, err)

	// Start the projection
	//assert.Nil(t, w.projection.Start())
	//defer w.projection.Stop()
	//w.projection.WaitEndOfStream()

	t.Run("writes multiple events to a segment that is allocated to the current node", func(t *testing.T) {
		_, err := w.Write(&v1.AppendRequest{
			StreamName:       "foo",
			EventId:          uuid.NewString(),
			EventType:        "MyFirstEvent",
			Payload:          []byte("foo"),
			ExpectedPosition: nil,
		})

		assert.Nil(t, err)

		_, err = w.Write(&v1.AppendRequest{
			StreamName:       "foo",
			EventId:          uuid.NewString(),
			EventType:        "MySecondEvent",
			Payload:          []byte("bar"),
			ExpectedPosition: nil,
		})

		assert.Nil(t, err)
	})

	t.Skip("TODO: 2 concurrent writers will compete for the same segment but work")
}
