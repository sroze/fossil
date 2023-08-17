package store

import (
	"context"
	"github.com/sroze/fossil/simplestore"
	"github.com/sroze/fossil/store/segments"
	"github.com/stretchr/testify/assert"
	"golang.org/x/exp/maps"
	"golang.org/x/exp/slices"
	"testing"
)

func Test_Read(t *testing.T) {
	withFreshStore(t, func(ctx testingContext) {
		// Given the following segments:
		// - a ('foo') --> b (#1/2)
		//             \-> c (#2/2) --> d (#1/2)
		//     		       			\-> e (#1/2)

		// We'll generate a bunch of streams with events (prefixed with `foo`) and insert their
		// first third in `a`, second third between `b` and `c`, and last third between `b`, `d` and `e`.
		samples := 4
		numberOfEventsPerStream := 9 // so it is a multiple of 3
		writes, eventIdsPerStream := simplestore.GenerateEventWriteRequests(samples, numberOfEventsPerStream, "foo/")

		// Slice the writes, so we can write them at the right point in time during our test.
		writeSlices := mergeAndSplitWritesIntoChunks(writes, 3)
		assert.Equal(t, 3, len(writeSlices))

		// We'll evolve the segment topology and append segments.
		a, err := ctx.segmentManager.Create(segments.NewSegment(
			segments.NewPrefixRange("foo"),
		))
		assert.Nil(t, err)

		// We write the third of the events (they should go to `a`).
		_, err = ctx.store.Write(context.Background(), writeSlices[0])
		assert.Nil(t, err)

		// We split `a` into `b` and `c`.
		bAndC, err := ctx.segmentManager.Split(a.ID(), 2)
		assert.Nil(t, err)

		// We write the 2nd third of events:
		_, err = ctx.store.Write(context.Background(), writeSlices[1])
		assert.Nil(t, err)

		// We split `c` into `d` and `e`.
		_, err = ctx.segmentManager.Split(bAndC[1].ID(), 2)
		assert.Nil(t, err)

		// We write the last third of events:
		_, err = ctx.store.Write(context.Background(), writeSlices[2])
		assert.Nil(t, err)

		t.Run("reads streams across 3 segments", func(t *testing.T) {
			for stream, eventIds := range eventIdsPerStream {
				collectedEventIds := readStreamEventIds(ctx.store, stream, simplestore.ReadOptions{})
				assert.Equal(t, eventIds, collectedEventIds)
			}
		})

		t.Run("can read the stream backwards", func(t *testing.T) {
			streams := maps.Keys(eventIdsPerStream)
			eventIds := readStreamEventIds(ctx.store, streams[0], simplestore.ReadOptions{Backwards: true})
			slices.Reverse(eventIds)

			assert.Equal(t, eventIdsPerStream[streams[0]], eventIds)
		})

		t.Run("can read only a certain number of events", func(t *testing.T) {
			streams := maps.Keys(eventIdsPerStream)
			eventIds := readStreamEventIds(ctx.store, streams[1], simplestore.ReadOptions{
				Limit: 2,
			})
			assert.Equal(t, eventIdsPerStream[streams[1]][:2], eventIds)
		})

		t.Run("can read the stream from a given position", func(t *testing.T) {
			streams := maps.Keys(eventIdsPerStream)
			eventIds := readStreamEventIds(ctx.store, streams[2], simplestore.ReadOptions{
				StartingPosition: 3,
			})

			assert.Equal(t, eventIdsPerStream[streams[2]][3:], eventIds)
		})
	})
}

func readStreamEventIds(s *Store, stream string, options simplestore.ReadOptions) []string {
	ch := make(chan simplestore.ReadItem)
	go s.Read(context.Background(), stream, ch, options)
	var collectedEventIds []string
	for item := range ch {
		collectedEventIds = append(collectedEventIds, item.EventInStream.Event.EventId)
	}
	return collectedEventIds
}
