package simplestore

import (
	"context"
	"github.com/apple/foundationdb/bindings/go/src/fdb"
	"github.com/google/uuid"
	"github.com/sroze/fossil/kv/foundationdb"
	"github.com/stretchr/testify/assert"
	"testing"
)

func Test_Prepare(t *testing.T) {
	fdb.MustAPIVersion(720)
	s := NewStore(
		foundationdb.NewStore(fdb.MustOpenDatabase("../fdb.cluster")),
		uuid.NewString(),
	)

	t.Run("can prepare two writes in parallel and successfully write them", func(t *testing.T) {
		prepared, optimisticResults, err := s.PrepareKvWrites(context.Background(), []AppendToStream{
			{
				Stream: "Foo/" + uuid.NewString(),
				Events: []Event{{EventId: uuid.NewString(), EventType: "Foo", Payload: []byte("foo")}},
			},
		})
		assert.Nil(t, err)
		assert.Equal(t, 1, len(optimisticResults))
		assert.Equal(t, int64(0), optimisticResults[0].Position)

		prepared2, optimisticResults2, err := s.PrepareKvWrites(context.Background(), []AppendToStream{
			{
				Stream: "Bar/" + uuid.NewString(),
				Events: []Event{{EventId: uuid.NewString(), EventType: "Foo", Payload: []byte("foo")}},
			},
		})
		assert.Nil(t, err)
		assert.Equal(t, 1, len(optimisticResults2))
		assert.Equal(t, int64(0), optimisticResults2[0].Position)

		// get segment position and lock
		w1, unlock, err := s.TransformWritesAndAcquirePositionLock(context.Background(), prepared)
		unlock()
		assert.Nil(t, err)

		w2, unlock, err := s.TransformWritesAndAcquirePositionLock(context.Background(), prepared2)
		unlock()
		assert.Nil(t, err)

		err = s.kv.Write(append(w1, w2...))
		assert.Nil(t, err)
	})

	t.Run("given a stream with events", func(t *testing.T) {
		// Given a stream with 2 events
		stream := "Foo/" + uuid.NewString()
		_, err := s.Write(context.Background(), []AppendToStream{{
			Stream: stream,
			Events: []Event{
				{EventId: uuid.NewString(), EventType: "Foo", Payload: []byte("foo")},
				{EventId: uuid.NewString(), EventType: "Bar", Payload: []byte("bar")},
			},
			Condition: &AppendCondition{StreamIsEmpty: true},
		}})
		assert.Nil(t, err)

		t.Run("waits for optimistic writes to fail an empty stream condition", func(t *testing.T) {
			pw, er, err := s.PrepareKvWrites(context.Background(), []AppendToStream{
				{
					Stream: stream,
					Events: []Event{{EventId: uuid.NewString(), EventType: "Foo", Payload: []byte("foo")}},
					Condition: &AppendCondition{
						StreamIsEmpty: true,
					},
				},
			})
			assert.Nil(t, err)
			assert.Equal(t, int64(0), er[0].Position)

			w, unlock, err := s.TransformWritesAndAcquirePositionLock(context.Background(), pw)
			unlock()
			assert.Nil(t, err)

			err = s.kv.Write(w)
			assert.NotNil(t, err)

			known, err := s.HandleError(err)
			assert.True(t, known)
			assert.NotNil(t, err)
			sce, isStreamConditionalErr := err.(StreamConditionFailed)
			assert.True(t, isStreamConditionalErr)
			assert.Equal(t, stream, sce.Stream)
		})

		t.Run("waits for optimistic writes to fail a stream position condition", func(t *testing.T) {
			pw, er, err := s.PrepareKvWrites(context.Background(), []AppendToStream{
				{
					Stream: stream,
					Events: []Event{{EventId: uuid.NewString(), EventType: "Foo", Payload: []byte("foo")}},
					Condition: &AppendCondition{
						WriteAtPosition: 1,
					},
				},
			})
			assert.Nil(t, err)
			assert.Equal(t, int64(1), er[0].Position)

			w, unlock, err := s.TransformWritesAndAcquirePositionLock(context.Background(), pw)
			unlock()
			assert.Nil(t, err)

			err = s.kv.Write(w)
			assert.NotNil(t, err)

			known, err := s.HandleError(err)
			assert.True(t, known)
			assert.NotNil(t, err)
		})
	})
}
