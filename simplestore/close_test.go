package simplestore

import (
	"context"
	"errors"
	"github.com/apple/foundationdb/bindings/go/src/fdb"
	"github.com/google/uuid"
	"github.com/sroze/fossil/kv/foundationdb"
	"github.com/stretchr/testify/assert"
	"testing"
)

func Test_Close(t *testing.T) {
	fdb.MustAPIVersion(720)

	t.Run("a closed store cannot be written to", func(t *testing.T) {
		kvs := foundationdb.NewStore(fdb.MustOpenDatabase("../fdb.cluster"))
		storeToBeClosed := NewStore(kvs, uuid.NewString())
		writes, err := storeToBeClosed.PrepareCloseKvWrites(context.Background())
		assert.Nil(t, err)
		err = kvs.Write(writes)
		assert.Nil(t, err)

		_, err = storeToBeClosed.Write(context.Background(), []AppendToStream{
			{
				Stream: "Foo/" + uuid.NewString(),
				Events: []Event{
					{EventId: uuid.NewString(), EventType: "Foo", Payload: []byte("foo")},
				},
			},
		})
		assert.NotNil(t, err)
		assert.True(t, errors.Is(err, StoreIsClosedErr{}))
	})
}
