package store

import (
	"context"
	"github.com/google/uuid"
	"github.com/sroze/fossil/simplestore"
	"github.com/sroze/fossil/store/pool"
	"github.com/sroze/fossil/store/segments"
	"github.com/sroze/fossil/store/topology"
	"github.com/stretchr/testify/assert"
	"sync"
	"testing"
)

func Test_Writer(t *testing.T) {
	withFreshStore(t, func(ctx testingContext) {
		_, err := ctx.segmentManager.Create(segments.NewSegment(
			segments.NewPrefixRange("foo"),
		))
		assert.Nil(t, err)

		t.Run("a writer can restart and pick up the last segment's position", func(t *testing.T) {
			stream := "foo" + uuid.NewString()
			writer1 := NewStore(ctx.segmentManager, ctx.kv)
			_, err := writer1.Write(context.Background(), []simplestore.AppendToStream{
				{
					Stream: stream,
					Events: []simplestore.Event{
						{EventId: uuid.NewString(), EventType: "Foo", Payload: []byte("foo")},
					},
					Condition: &simplestore.AppendCondition{
						StreamIsEmpty: true,
					},
				},
			})
			assert.Nil(t, err)

			writer2 := NewStore(ctx.segmentManager, ctx.kv)
			_, err = writer2.Write(context.Background(), []simplestore.AppendToStream{
				{
					Stream: stream,
					Events: []simplestore.Event{
						{EventId: uuid.NewString(), EventType: "Bar", Payload: []byte("bar")},
					},
					Condition: &simplestore.AppendCondition{
						WriteAtPosition: 1,
					},
				},
			})

			assert.Nil(t, err)
		})

		t.Run("writes multiple events in a stream at once", func(t *testing.T) {
			stream := "foo/" + uuid.NewString()

			r, err := ctx.store.Write(context.Background(), []simplestore.AppendToStream{
				{Stream: stream, Events: []simplestore.Event{
					{EventId: uuid.NewString(), EventType: "Baz1", Payload: []byte("bar")},
					{EventId: uuid.NewString(), EventType: "Baz2", Payload: []byte("bar")},
				}},
			})

			assert.Nil(t, err)
			assert.Equal(t, int64(1), r[0].Position)
		})
	})

	t.Run("writing in streams across segments", func(t *testing.T) {
		withFreshStore(t, func(ctx testingContext) {
			// Create a segment for `foo`
			firstSegment, err := ctx.segmentManager.Create(segments.NewSegment(
				segments.NewPrefixRange("foo"),
			))
			assert.Nil(t, err)

			// Write an event on the stream (in the first segment)
			stream := "foo/" + uuid.NewString()
			_, err = ctx.store.Write(context.Background(), []simplestore.AppendToStream{
				{
					Stream: stream,
					Events: []simplestore.Event{
						{EventId: uuid.NewString(), EventType: "Foo", Payload: []byte("foo")},
					},
				},
			})
			assert.Nil(t, err)

			// Split the segment in 2
			_, err = ctx.segmentManager.Split(firstSegment.ID(), 2)
			assert.Nil(t, err)

			t.Run("fails on expecting the wrong stream position with no stream event in the segment", func(t *testing.T) {
				_, err := ctx.store.Write(context.Background(), []simplestore.AppendToStream{
					{
						Stream: stream,
						Events: []simplestore.Event{
							{EventId: uuid.NewString(), EventType: "Bar", Payload: []byte("bar")},
						},
						Condition: &simplestore.AppendCondition{
							WriteAtPosition: 3,
						},
					},
				})

				assert.NotNil(t, err)
			})
		})

		withFreshStore(t, func(ctx testingContext) {
			// Create a segment for `foo`
			firstSegment, err := ctx.segmentManager.Create(segments.NewSegment(
				segments.NewPrefixRange("foo"),
			))
			assert.Nil(t, err)

			// Write an event on the stream (in the first segment)
			stream := "foo/" + uuid.NewString()
			_, err = ctx.store.Write(context.Background(), []simplestore.AppendToStream{
				{
					Stream: stream,
					Events: []simplestore.Event{
						{EventId: uuid.NewString(), EventType: "Foo", Payload: []byte("foo")},
					},
				},
			})
			assert.Nil(t, err)

			// Split the segment in 2
			_, err = ctx.segmentManager.Split(firstSegment.ID(), 2)
			assert.Nil(t, err)

			t.Run("automatically increment the stream position across segments", func(t *testing.T) {
				// Write an event on the stream (in the second segment)
				r, err := ctx.store.Write(context.Background(), []simplestore.AppendToStream{
					{
						Stream: stream,
						Events: []simplestore.Event{
							{EventId: uuid.NewString(), EventType: "Bar", Payload: []byte("bar")},
						},
					},
				})

				assert.Nil(t, err)
				assert.Equal(t, int64(1), r[0].Position)
			})
		})

		withFreshStore(t, func(ctx testingContext) {
			// Create a segment for `foo`
			firstSegment, err := ctx.segmentManager.Create(segments.NewSegment(
				segments.NewPrefixRange("foo"),
			))
			assert.Nil(t, err)

			// Write an event on the stream (in the first segment)
			stream := "foo/" + uuid.NewString()
			_, err = ctx.store.Write(context.Background(), []simplestore.AppendToStream{
				{
					Stream: stream,
					Events: []simplestore.Event{
						{EventId: uuid.NewString(), EventType: "Foo", Payload: []byte("foo")},
					},
				},
			})
			assert.Nil(t, err)

			// Split the segment in 2
			_, err = ctx.segmentManager.Split(firstSegment.ID(), 2)
			assert.Nil(t, err)

			t.Run("writes multiple events in a stream at once", func(t *testing.T) {
				r, err := ctx.store.Write(context.Background(), []simplestore.AppendToStream{
					{Stream: stream, Events: []simplestore.Event{
						{EventId: uuid.NewString(), EventType: "Foo", Payload: []byte("foo")},
						{EventId: uuid.NewString(), EventType: "Bar", Payload: []byte("bar")},
					}},
				})

				assert.Nil(t, err)
				assert.Equal(t, int64(2), r[0].Position)
			})
		})
	})

	t.Run("2 concurrent writers will compete for the same segment but work", func(t *testing.T) {
		withFreshStore(t, func(ctx testingContext) {
			// Create a segment for `foo`
			_, err := ctx.segmentManager.Create(segments.NewSegment(
				segments.NewPrefixRange("foo"),
			))
			assert.Nil(t, err)

			// We create 2 store instances, pretending they are 2 different processes running on different machines.
			w1 := NewStore(ctx.segmentManager, ctx.kv)
			w2 := NewStore(ctx.segmentManager, ctx.kv)

			wg := sync.WaitGroup{}
			wg.Add(2)

			go func() {
				_, err := w1.Write(context.Background(), []simplestore.AppendToStream{
					{
						Stream: "foo/" + uuid.NewString(),
						Events: []simplestore.Event{
							{EventId: uuid.NewString(), EventType: "Foo", Payload: []byte("foo")},
						},
					},
				})
				assert.Nil(t, err)
				wg.Done()
			}()

			go func() {
				_, err := w2.Write(context.Background(), []simplestore.AppendToStream{
					{
						Stream: "foo/" + uuid.NewString(),
						Events: []simplestore.Event{
							{EventId: uuid.NewString(), EventType: "Foo", Payload: []byte("foo")},
						},
					},
				})
				assert.Nil(t, err)
				wg.Done()
			}()

			wg.Wait()
		})
	})

	t.Run("eventually consistent topology view does not cause out-of-order writes", func(t *testing.T) {
		// This scenario is relatively complex but very important to take into account.
		// Due to the eventual consistency nature of the topology manager, two concurrent writers (w1 and w2) might have
		// at a given time a different perception of the world: they might both think that they should handle the write
		// on different segments. In particular, at the moment where a segment is closed and replaced by a new one,
		// if the current segment writer still handles writes while a new writer handles writes for the more recent segment,
		// we might end up with out-of-order writes.

		withFreshStore(t, func(ctx testingContext) {
			topologyStream := "topology/" + uuid.NewString()

			// Create two writers, each with their own topology manager.
			manager1 := topology.NewManager(ctx.ss, topologyStream, RootCodec, pool.NewSimpleStorePool(ctx.kv), ctx.kv)
			w1 := NewStore(manager1, ctx.kv)
			manager2 := topology.NewManager(ctx.ss, topologyStream, RootCodec, pool.NewSimpleStorePool(ctx.kv), ctx.kv)
			w2 := NewStore(manager2, ctx.kv)

			// We create a single segment and wait for both writers to be ready.
			assert.Nil(t, manager1.Start())
			manager1.WaitReady()
			firstSegment, err := manager1.Create(segments.NewSegment(
				segments.NewPrefixRange("foo"),
			))
			assert.Nil(t, err)
			assert.Nil(t, manager2.Start())
			manager2.WaitReady()

			// We stop `w1`'s topology manager, meaning it doesn't know about new topology changes.
			manager1.Stop()

			// We split the segment in two (so we have new segments)
			_, err = manager2.Split(firstSegment.ID(), 2)
			assert.Nil(t, err)

			// We write an event ("event1" in stream `foo/123`) with `w2` that knows about the last changes and
			// we expect it to succeed.
			_, err = w2.Write(context.Background(), []simplestore.AppendToStream{
				{Stream: "foo/123", Events: []simplestore.Event{
					{EventId: uuid.NewString(), EventType: "event1", Payload: []byte("foo")},
				}},
			})
			assert.Nil(t, err)

			// We write an event ("event2" in stream `foo/123`) with `w1` that doesn't know about the last changes.
			// We expect an error, because the segment `w1` is trying to write to is closed.
			_, err = w1.Write(context.Background(), []simplestore.AppendToStream{
				{Stream: "foo/123", Events: []simplestore.Event{
					{EventId: uuid.NewString(), EventType: "event2", Payload: []byte("foo")},
				}},
			})
			assert.NotNil(t, err)
		})
	})
}
