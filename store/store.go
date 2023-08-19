package store

import (
	"github.com/google/uuid"
	"github.com/sroze/fossil/kv"
	"github.com/sroze/fossil/simplestore"
	"github.com/sroze/fossil/store/pool"
	"github.com/sroze/fossil/store/topology"
)

type Store struct {
	// Internal matters.
	id              uuid.UUID
	topologyManager *topology.Manager
	kv              kv.KV
	pool            *pool.SimpleStorePool
}

func NewStore(
	kv kv.KV,
	id uuid.UUID,
) *Store {
	ss := simplestore.NewStore(kv, id.String())
	topologyManager := topology.NewManager(
		ss,
		"$system",
		RootCodec,
		pool.NewSimpleStorePool(kv),
		kv,
	)

	return &Store{
		id:              id,
		topologyManager: topologyManager,
		kv:              kv,
		pool:            pool.NewSimpleStorePool(kv),
	}
}

func (s *Store) Start() error {
	err := s.topologyManager.Start()
	if err != nil {
		return err
	}

	s.topologyManager.WaitReady()

	return nil
}

func (s *Store) Stop() {
	s.topologyManager.Stop()
}

func (s *Store) GetTopologyManager() *topology.Manager {
	return s.topologyManager
}
