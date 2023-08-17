package store

import (
	"context"
	"github.com/apple/foundationdb/bindings/go/src/fdb"
	"github.com/google/uuid"
	"github.com/sroze/fossil/eskit"
	"github.com/sroze/fossil/kv/foundationdb"
	"github.com/sroze/fossil/livetail"
	"github.com/sroze/fossil/simplestore"
	"github.com/sroze/fossil/store/segments"
	"github.com/sroze/fossil/store/topology"
	"github.com/stretchr/testify/assert"
	"golang.org/x/exp/maps"
	"math"
	"testing"
)

func Test_Query(t *testing.T) {
	fdb.MustAPIVersion(720)
	kv := foundationdb.NewStore(fdb.MustOpenDatabase("../fdb.cluster"))
	ss := simplestore.NewStore(kv, uuid.NewString())
	rw := eskit.NewReaderWriter(ss, RootCodec)

	t.Run("streams written in multiple segments over time", func(t *testing.T) {
		stream := "topology/" + uuid.NewString()
		segmentManager := topology.NewManager(
			livetail.NewLiveTail(livetail.NewStreamReader(ss, stream)),
			RootCodec,
			rw,
			stream,
		)

		assert.Nil(t, segmentManager.Start())
		segmentManager.WaitReady()
		defer segmentManager.Stop()
		store := NewStore(segmentManager, kv)

		// Given the following segments:
		// - a ('foo') --> b (#1/2)
		//             \-> c (#2/2) --> d (#1/2)
		//     		       			\-> e (#1/2)

		// We'll generate a bunch of streams with events (prefixed with `foo`) and insert their
		// first third in `a`, second third between `b` and `c`, and last third between `b`, `d` and `e`.
		samples := 4
		numberOfEventsPerStream := 3
		writes, eventIdsPerStream := simplestore.GenerateEventWriteRequests(samples, numberOfEventsPerStream, "foo/")
		streams := maps.Keys(eventIdsPerStream)

		// Slice the writes, so we can write them at the right point in time during our test.
		writeSlices := mergeAndSplitWritesIntoChunks(writes, 3)
		assert.Equal(t, 3, len(writeSlices))

		// We'll evolve the segment topology and append segments.
		a, err := segmentManager.Create(segments.NewSegment(
			segments.NewPrefixRange("foo"),
		))
		assert.Nil(t, err)

		// We write the third of the events (they should go to `a`).
		_, err = store.Write(context.Background(), writeSlices[0])
		assert.Nil(t, err)

		// We split `a` into `b` and `c`.
		bAndC, err := segmentManager.Split(a.ID(), 2)
		assert.Nil(t, err)

		// We write the 2nd third of events:
		_, err = store.Write(context.Background(), writeSlices[1])
		assert.Nil(t, err)

		// We split `c` into `d` and `e`.
		_, err = segmentManager.Split(bAndC[1].ID(), 2)
		assert.Nil(t, err)

		// We write the last third of events:
		_, err = store.Write(context.Background(), writeSlices[2])
		assert.Nil(t, err)

		// We'll then assert that the query returns the events in order, for each stream.
		t.Run("it returns all the events in order", func(t *testing.T) {
			ch := make(chan QueryItem)
			go store.Query(context.Background(), "foo", "0", ch)

			readEventsPerStream, err := collectItemsPerStream(ch)
			assert.Nil(t, err)
			assert.Equal(t, eventIdsPerStream, readEventsPerStream)
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

		t.Run("returns position cursors that we can use to continue through the streams", func(t *testing.T) {
			ch := make(chan QueryItem)

			// In this test, we'll read roughly a third of the events, then stop and resume from the
			// position cursor we got, and continue until we are done.
			go func() {
				position := PositionCursor("0")
				defer close(ch)

				i := 0
				for {
					intermediaryCh := make(chan QueryItem)
					ctx, cancel := context.WithCancel(context.Background())
					go store.Query(ctx, "foo", position, intermediaryCh)

					readCount := 0
					for item := range intermediaryCh {
						if item.Error != nil {
							t.Error(item.Error)
							cancel()
							return
						} else if item.Position == nil {
							t.Error("expected a position cursor (nil)")
							cancel()
							return
						}

						ch <- item

						if item.EventInStream != nil {
							i++
							readCount++
						}

						position = *item.Position

						// We 'randomly' stop after a few events, to simulate a "stop & query with position again".
						if i%samples == 0 {
							break
						}
					}

					// TODO: Replace by a "proper" end of query signal.
					if readCount == 0 {
						// We're done, it's empty :)
						break
					}
				}
			}()

			// Despite the stop and start, expect to read all the events, in the right order.
			readEventsPerStream, err := collectItemsPerStream(ch)
			assert.Nil(t, err)
			assert.Equal(t, eventIdsPerStream, readEventsPerStream)
		})
	})

	t.Run("with a simple split segment", func(t *testing.T) {
		stream := "topology/" + uuid.NewString()
		segmentManager := topology.NewManager(
			livetail.NewLiveTail(livetail.NewStreamReader(ss, stream)),
			RootCodec,
			rw,
			stream,
		)

		assert.Nil(t, segmentManager.Start())
		segmentManager.WaitReady()
		defer segmentManager.Stop()
		store := NewStore(segmentManager, kv)

		// Given the following segments:
		// - a ('foo') --> b (#1/2)
		//             \-> c (#2/2)
		a, err := segmentManager.Create(segments.NewSegment(
			segments.NewPrefixRange("foo"),
		))
		assert.Nil(t, err)
		_, err = segmentManager.Split(a.ID(), 2)
		assert.Nil(t, err)

		writes, eventsPerStream := simplestore.GenerateEventWriteRequests(2, 2, "foo/") // 4 events total.
		mergedWrites, err := mergeCommandsPerStream(writes)
		assert.Nil(t, err)
		_, err = store.Write(context.Background(), mergedWrites)
		assert.Nil(t, err)

		t.Run("it can query and paginate through results in order", func(t *testing.T) {
			target := make(map[string][]string)
			firstChannel := make(chan QueryItem, 2)
			go store.Query(context.Background(), "foo", "0", firstChannel)

			lastPosition, err := collectItemsPerStreamInto(target, firstChannel, 2)
			assert.Nil(t, err)
			assert.NotNil(t, lastPosition)

			secondChannel := make(chan QueryItem)
			go store.Query(context.Background(), "foo", *lastPosition, secondChannel)
			lastPosition, err = collectItemsPerStreamInto(target, secondChannel, 2)
			assert.Nil(t, err)
			assert.NotNil(t, lastPosition)

			lastChannel := make(chan QueryItem)
			go store.Query(context.Background(), "foo", *lastPosition, lastChannel)
			item, more := <-lastChannel
			assert.Nil(t, item.Error)
			assert.Nil(t, item.EventInStream)
			assert.False(t, more)

			assert.Equal(t, eventsPerStream, target)
		})
	})
}

func collectItemsPerStreamInto(target map[string][]string, ch chan QueryItem, limit int) (*PositionCursor, error) {
	var lastItem QueryItem
	count := 0

	for item := range ch {
		lastItem = item
		if item.Error != nil {
			return nil, item.Error
		}

		if item.EventInStream != nil {
			target[item.EventInStream.Stream] = append(target[item.EventInStream.Stream], item.EventInStream.Event.EventId)
			count++

			if limit > 0 && count >= limit {
				break
			}
		}
	}

	return lastItem.Position, nil
}

func collectItemsPerStream(ch chan QueryItem) (map[string][]string, error) {
	readEventsPerStream := make(map[string][]string)
	_, err := collectItemsPerStreamInto(readEventsPerStream, ch, 0)
	return readEventsPerStream, err
}

func mergeAndSplitWritesIntoChunks(writes []simplestore.AppendToStream, count int) [][]simplestore.AppendToStream {
	chunkCount := math.Ceil(float64(len(writes)) / float64(count))
	chunks := chunkSlice(writes, int(chunkCount))

	mergedChunks := make([][]simplestore.AppendToStream, len(chunks))
	for i, chunk := range chunks {
		merged, err := mergeCommandsPerStream(chunk)
		if err != nil {
			panic(err)
		}

		mergedChunks[i] = merged
	}

	return mergedChunks
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
