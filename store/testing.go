package store

import (
	"github.com/apple/foundationdb/bindings/go/src/fdb"
	"github.com/google/uuid"
	"github.com/sroze/fossil/kv"
	"github.com/sroze/fossil/kv/foundationdb"
	"github.com/sroze/fossil/simplestore"
	"github.com/sroze/fossil/store/pool"
	"github.com/sroze/fossil/store/topology"
	"github.com/stretchr/testify/assert"
	"testing"
)

type testingContext struct {
	segmentManager *topology.Manager
	kv             kv.KV
	store          *Store
	ss             *simplestore.SimpleStore
}

func withFreshStore(t *testing.T, f func(ctx testingContext)) {
	fdb.MustAPIVersion(720)
	kv := foundationdb.NewStore(fdb.MustOpenDatabase("../fdb.cluster"))
	ss := simplestore.NewStore(kv, uuid.NewString())
	managerStream := "topology/" + uuid.NewString()
	segmentManager := topology.NewManager(ss, managerStream, RootCodec, pool.NewSimpleStorePool(kv), kv)

	assert.Nil(t, segmentManager.Start())
	segmentManager.WaitReady()
	defer segmentManager.Stop()
	f(testingContext{
		segmentManager: segmentManager,
		kv:             kv,
		store:          NewStore(segmentManager, kv),
		ss:             ss,
	})
}
