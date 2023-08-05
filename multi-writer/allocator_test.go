package multi_writer

import (
	"context"
	"github.com/google/uuid"
	"github.com/sroze/fossil/store/eskit"
	"github.com/sroze/fossil/store/multi-writer/segments"
	presence2 "github.com/sroze/fossil/store/presence"
	"github.com/stretchr/testify/assert"
	"testing"
)

func Test_Allocator(t *testing.T) {
	t.Run("when a segment is created", func(t *testing.T) {
		t.Run("it allocates it to an available node", func(t *testing.T) {
			ss := eskit.NewInMemoryStore()
			stream := "foo/" + uuid.NewString()
			nodes := []presence2.Node{
				{Id: uuid.New()},
			}

			a := NewAllocator(ss, stream)

			// Given a segment was created
			segmentId := uuid.New()
			r, err := a.rw.Write([]eskit.EventToWrite{
				{
					Stream: stream,
					Event: presence2.NodeJoinedEvent{
						Node: nodes[0],
					},
				},
				{
					Stream: stream,
					Event: segments.SegmentCreatedEvent{
						Segment: segments.Segment{
							Id:          segmentId,
							StreamRange: segments.NewHashSplitRanges("", 1)[0],
						},
					},
				},
			})
			assert.Nil(t, err)

			// Start the allocator and wait for it to be done.
			assert.Nil(t, a.Start())
			defer a.Stop()
			a.subscription.WaitEndOfStream()

			// When the allocator has done its job
			ch := make(chan eskit.ReadItem)
			go a.rw.Read(context.Background(), stream, r[1].Position+1, ch)
			event := <-ch

			assert.Equal(t, &segments.SegmentAllocatedEvent{
				SegmentId: segmentId,
				NodeId:    nodes[0].Id,
			}, event.EventInStream.Event)
		})
	})

	t.Skip("when a node leaves")
	t.Skip("when a node arrives")
	t.Skip("it does not allocate a segment that has been allocated in the past when starting again")
}
