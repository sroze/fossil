package pool

import (
	"github.com/google/uuid"
	"github.com/sroze/fossil/kv"
	"github.com/sroze/fossil/simplestore"
	"sync"
)

type SimpleStorePool struct {
	kv                 kv.KV
	segmentStores      map[uuid.UUID]*simplestore.SimpleStore
	segmentStoresMutex sync.Mutex
}

func NewSimpleStorePool(kv kv.KV) *SimpleStorePool {
	return &SimpleStorePool{
		kv:            kv,
		segmentStores: map[uuid.UUID]*simplestore.SimpleStore{},
	}
}

func (r *SimpleStorePool) GetStoreForSegment(segmentId uuid.UUID) *simplestore.SimpleStore {
	r.segmentStoresMutex.Lock()
	defer r.segmentStoresMutex.Unlock()

	_, exists := r.segmentStores[segmentId]
	if !exists {
		r.segmentStores[segmentId] = simplestore.NewStore(
			r.kv,
			segmentId.String(),
		)
	}

	return r.segmentStores[segmentId]
}
