package streamstore

import (
	"context"
	"fmt"
	"github.com/apple/foundationdb/bindings/go/src/fdb"
	"github.com/apple/foundationdb/bindings/go/src/fdb/tuple"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"testing"
)

func Test_Write(t *testing.T) {
	fdb.MustAPIVersion(720)
	db := fdb.MustOpenDatabase("../../fdb.cluster")
	testingPrefix := uuid.NewString()

	t.Run("calls `OnWrite` hook when provided and provide a writable transaction", func(t *testing.T) {
		writeKey := tuple.Tuple{testingPrefix, "hook-called"}
		ss := NewFoundationStoreWithHooks(db, Hooks{
			OnWrite: func(t fdb.Transaction, writes []AppendToStream, results []AppendResult) error {
				t.Set(writeKey, []byte("true"))
				return nil
			},
		})

		_, err := ss.Write([]AppendToStream{{
			Stream: "Foo/" + uuid.NewString(),
			Events: []Event{{
				EventId:   uuid.NewString(),
				EventType: "Foo",
				Payload:   []byte(""),
			}},
		}})
		assert.Nil(t, err)

		r, err := db.Transact(func(t fdb.Transaction) (interface{}, error) {
			return t.Get(writeKey).Get()
		})
		assert.Nil(t, err)
		assert.Equal(t, []byte("true"), r.([]byte))
	})

	t.Run("fails the whole transaction if hook returns an error", func(t *testing.T) {
		ss := NewFoundationStoreWithHooks(db, Hooks{
			OnWrite: func(t fdb.Transaction, writes []AppendToStream, results []AppendResult) error {
				return fmt.Errorf("oups")
			},
		})

		stream := "Foo/" + uuid.NewString()
		_, err := ss.Write([]AppendToStream{{
			Stream: stream,
			Events: []Event{{
				EventId:   uuid.NewString(),
				EventType: "Foo",
				Payload:   []byte(""),
			}},
		}})
		assert.NotNil(t, err)

		// Expects an empty channel.
		ch := make(chan ReadItem)
		go ss.Read(context.Background(), stream, 0, ch)
		_, more := <-ch
		assert.False(t, more)
	})
}
