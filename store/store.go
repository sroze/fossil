package store

import (
	"github.com/google/uuid"
	"github.com/sroze/fossil/kv"
	"github.com/sroze/fossil/simplestore"
	"github.com/sroze/fossil/store/topology"
	"sync"
)

type Store struct {
	// Internal matters.
	locator            topology.SegmentLocator
	kv                 kv.KV
	segmentStores      map[uuid.UUID]*simplestore.SimpleStore
	segmentStoresMutex sync.Mutex
}

func NewStore(
	locator topology.SegmentLocator,
	kv kv.KV,
) *Store {
	return &Store{
		locator:       locator,
		kv:            kv,
		segmentStores: map[uuid.UUID]*simplestore.SimpleStore{},
	}
}
