package store

import (
	"github.com/google/uuid"
	"github.com/sroze/fossil/simplestore"
	"github.com/sroze/fossil/store/segments"
	"github.com/stretchr/testify/assert"
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
			_, err := writer1.Write([]simplestore.AppendToStream{
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
			_, err = writer2.Write([]simplestore.AppendToStream{
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

			r, err := ctx.store.Write([]simplestore.AppendToStream{
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
			_, err = ctx.store.Write([]simplestore.AppendToStream{
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
				_, err := ctx.store.Write([]simplestore.AppendToStream{
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
			_, err = ctx.store.Write([]simplestore.AppendToStream{
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
				r, err := ctx.store.Write([]simplestore.AppendToStream{
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
			_, err = ctx.store.Write([]simplestore.AppendToStream{
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
				r, err := ctx.store.Write([]simplestore.AppendToStream{
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

	// t.Skip("TODO: 2 concurrent writers will compete for the same segment but work")

	// t.Skip("TODO: eventually consistent topology view does not cause out-of-order writes")
	// i.e. when 2 writers process requests concurrently, with different view of the world after a topology change (i.e. split or replace).
	//   -> wink, wink: "closed" segment event at the head?
}
