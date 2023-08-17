package store

import (
	"github.com/apple/foundationdb/bindings/go/src/fdb"
	"github.com/google/uuid"
	"github.com/sroze/fossil/eskit"
	"github.com/sroze/fossil/kv"
	"github.com/sroze/fossil/kv/foundationdb"
	"github.com/sroze/fossil/livetail"
	"github.com/sroze/fossil/simplestore"
	"github.com/sroze/fossil/store/topology"
	"github.com/stretchr/testify/assert"
	"testing"
)

type testingContext struct {
	segmentManager *topology.Manager
	kv             kv.KV
	store          *Store
}

func withFreshStore(t *testing.T, f func(ctx testingContext)) {
	fdb.MustAPIVersion(720)
	kv := foundationdb.NewStore(fdb.MustOpenDatabase("../fdb.cluster"))
	ss := simplestore.NewStore(kv, uuid.NewString())
	rw := eskit.NewReaderWriter(ss, RootCodec)

	managerStream := "topology/" + uuid.NewString()
	segmentManager := topology.NewManager(
		livetail.NewLiveTail(livetail.NewStreamReader(ss, managerStream)),
		RootCodec,
		rw,
		managerStream,
	)

	assert.Nil(t, segmentManager.Start())
	segmentManager.WaitReady()
	defer segmentManager.Stop()
	f(testingContext{
		segmentManager: segmentManager,
		kv:             kv,
		store:          NewStore(segmentManager, kv),
	})
}
