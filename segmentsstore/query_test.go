package segmentsstore

import (
	"context"
	"github.com/google/uuid"
	"github.com/sroze/fossil/eskit"
	multi_writer "github.com/sroze/fossil/multi-writer"
	"github.com/sroze/fossil/segments"
	"github.com/sroze/fossil/streamstore"
	"github.com/sroze/fossil/topology"
	"github.com/stretchr/testify/assert"
	"testing"
)

func Test_Query(t *testing.T) {
	ss := eskit.NewInMemoryStore()
	rw := eskit.NewReaderWriter(ss, multi_writer.RootCodec)
	segmentManager := topology.NewManager(rw, "topology/"+uuid.NewString())
	assert.Nil(t, segmentManager.Start())
	segmentManager.WaitReady()
	defer segmentManager.Stop()

	store := NewSegmentStore(ss, segmentManager)

	t.Run("streams written in multiple segments over time", func(t *testing.T) {
		// Given the following segments:
		// - a ('foo') --> b (#1/2)
		//             \-> c (#2/2) --> d (#1/2)
		//     		       			\-> e (#1/2)

		// We'll generate a bunch of streams with events (prefixed with `foo`) and insert their
		// first third in `a`, second third between `b` and `c`, and last third between `b`, `d` and `e`.
		samples := 40
		numberOfEventsPerStream := 9 // so it is a multiple of 3

		var streams []string
		for i := 0; i < samples; i++ {
			streams = append(streams, "foo/"+uuid.NewString())
		}

		var writes []streamstore.AppendToStream
		writtenEventsPerStream := make(map[string][]string)
		for i := 0; i < numberOfEventsPerStream; i++ {
			for _, stream := range streams {
				eventId := uuid.NewString()
				writtenEventsPerStream[stream] = append(writtenEventsPerStream[stream], eventId)

				writes = append(writes, streamstore.AppendToStream{
					Stream: stream,
					Events: []streamstore.Event{
						{
							EventId:   eventId,
							EventType: "AnEventOfTypeFoo",
							Payload:   []byte("foo"),
						},
					},
				})
			}
		}

		// Slice the writes, so we can write them at the right point in time during our test.
		writeSlices := chunkSlice(writes, (numberOfEventsPerStream*samples)/3)
		assert.Equal(t, 3, len(writeSlices))

		// We'll evolve the segment topology and append segments.
		a, err := segmentManager.Create(segments.NewSegment(
			segments.NewPrefixRange("foo"),
		))
		assert.Nil(t, err)

		// We write the third of the events (they should go to `a`).
		_, err = store.Write(writeSlices[0])
		assert.Nil(t, err)

		// We split `a` into `b` and `c`.
		bAndC, err := segmentManager.Split(a.ID(), 2)
		assert.Nil(t, err)

		// We write the 2nd third of events:
		_, err = store.Write(writeSlices[1])
		assert.Nil(t, err)

		// We split `c` into `d` and `e`.
		_, err = segmentManager.Split(bAndC[1].ID(), 2)
		assert.Nil(t, err)

		// We write the last third of events:
		_, err = store.Write(writeSlices[2])
		assert.Nil(t, err)

		// We'll then assert that the query returns the events in order, for each stream.
		t.Run("it returns all the events in order", func(t *testing.T) {
			ch := make(chan QueryItem)
			go store.Query(context.Background(), "foo", "0", ch)

			readEventsPerStream := make(map[string][]string)
			for item := range ch {
				if item.Error != nil {
					t.Error(item.Error)
					return
				}

				if item.EventInStream != nil {
					readEventsPerStream[item.EventInStream.Stream] = append(readEventsPerStream[item.EventInStream.Stream], item.EventInStream.Event.EventId)
				}
			}

			assert.Equal(t, writtenEventsPerStream, readEventsPerStream)
		})

		t.Run("queries a subset of streams within segments", func(t *testing.T) {
			prefix := streams[0][:len("foo/")+1]
			numberOfStreamsWithPrefix := 0
			for _, stream := range streams {
				if stream[:len(prefix)] == prefix {
					numberOfStreamsWithPrefix++
				}
			}

			assert.Greater(t, numberOfStreamsWithPrefix, 0)

			ch := make(chan QueryItem)
			go store.Query(context.Background(), prefix, "0", ch)

			eventCount := 0
			for item := range ch {
				if item.Error != nil {
					t.Error(item.Error)
					return
				}

				if item.EventInStream != nil {
					assert.Equal(t, prefix, item.EventInStream.Stream[:len(prefix)])
					eventCount++
				}
			}

			assert.Equal(t, numberOfStreamsWithPrefix*numberOfEventsPerStream, eventCount)
		})

		t.Run("TODO: paginates through with the position cursor", func(t *testing.T) {

		})
	})
}

func chunkSlice[T any](slice []T, chunkSize int) [][]T {
	var chunks [][]T
	for {
		if len(slice) == 0 {
			break
		}

		// necessary check to avoid slicing beyond
		// slice capacity
		if len(slice) < chunkSize {
			chunkSize = len(slice)
		}

		chunks = append(chunks, slice[0:chunkSize])
		slice = slice[chunkSize:]
	}

	return chunks
}
