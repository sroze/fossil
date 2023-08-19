package store

import (
	"github.com/sroze/fossil/kv"
	"github.com/sroze/fossil/store/pool"
	"github.com/sroze/fossil/store/topology"
)

type Store struct {
	// Internal matters.
	locator topology.SegmentLocator
	kv      kv.KV
	pool    *pool.SimpleStorePool
}

func NewStore(
	locator topology.SegmentLocator,
	kv kv.KV,
) *Store {
	return &Store{
		locator: locator,
		kv:      kv,
		pool:    pool.NewSimpleStorePool(kv),
	}
}
