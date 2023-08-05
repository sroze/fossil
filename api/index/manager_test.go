package index

import (
	"github.com/apple/foundationdb/bindings/go/src/fdb"
	"github.com/google/uuid"
	"github.com/sroze/fossil/streamstore"
	"github.com/stretchr/testify/assert"
	"testing"
)

func Test_manager(t *testing.T) {
	fdb.MustAPIVersion(720)
	m := NewManager(
		streamstore.NewFoundationStore(fdb.MustOpenDatabase("../../fdb.cluster")),
		"test/indexes/"+uuid.NewString(),
	)

	t.Run("returns the index to write to, given a stream name", func(t *testing.T) {
		assert.Nil(t, m.Start())
		defer m.Stop()

		err := m.CreateIndex("stores/123")
		assert.Nil(t, err)
		err = m.CreateIndex("stores/987")
		assert.Nil(t, err)

		indexes := m.GetIndexesToWriteInto("stores/123/streams/456")
		assert.Equal(t, 1, len(indexes))
		assert.Equal(t, "stores/123", indexes[0].StreamPrefix)
	})
}
