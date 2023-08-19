package store

import (
	"github.com/apple/foundationdb/bindings/go/src/fdb"
	"github.com/google/uuid"
	"github.com/sroze/fossil/kv"
	"github.com/sroze/fossil/kv/foundationdb"
	"github.com/stretchr/testify/assert"
	"testing"
)

type testingContext struct {
	kv    kv.KV
	store *Store
}

func withFreshStore(t *testing.T, f func(ctx testingContext)) {
	fdb.MustAPIVersion(720)
	kv := foundationdb.NewStore(fdb.MustOpenDatabase("../fdb.cluster"))
	store := NewStore(kv, uuid.New())
	assert.Nil(t, store.Start())
	defer store.Stop()

	f(testingContext{
		kv:    kv,
		store: store,
	})
}
