package index

import (
	"context"
	"github.com/apple/foundationdb/bindings/go/src/fdb"
	"github.com/google/uuid"
	streamstore2 "github.com/sroze/fossil/store/streamstore"
	"github.com/stretchr/testify/assert"
	"testing"
)

func Test_Operator(t *testing.T) {
	fdb.MustAPIVersion(720)
	db := fdb.MustOpenDatabase("../../fdb.cluster")
	im := NewManager(
		streamstore2.NewFoundationStore(db),
		uuid.NewString()+"test/indexes",
	)
	assert.Nil(t, im.Start())

	assert.Nil(t, im.CreateIndex("stores/123"))
	operator := NewOperator(im, db)
	ss := streamstore2.NewFoundationStoreWithHooks(db, streamstore2.Hooks{
		OnWrite: operator.OnWrite,
	})

	t.Run("write to the relevant index and is able to fetch event", func(t *testing.T) {
		event := streamstore2.Event{EventId: uuid.NewString(), EventType: "Foo", Payload: []byte("")}
		_, err := ss.Write([]streamstore2.AppendToStream{
			{Stream: "stores/123/streams/456", Events: []streamstore2.Event{event}},
		})

		assert.Nil(t, err)

		ch := make(chan ReadIndexItem, 10)
		ctx, cancel := context.WithCancel(context.Background())
		defer cancel()
		go operator.ReadFromIndexes(ctx, "stores/123", 0, ch)

		item := <-ch
		assert.Nil(t, item.Error)
		assert.NotNil(t, item.EventInStream)
		assert.Equal(t, event.EventId, item.EventInStream.Event.EventId)
	})
}
