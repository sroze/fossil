package pebble

import (
	"errors"
	"github.com/cockroachdb/pebble"
	"github.com/sroze/fossil/kv"
	"sync"
)

type Store struct {
	db    *pebble.DB
	mutex sync.Mutex
}

func NewStore(db *pebble.DB) *Store {
	return &Store{db: db}
}

func (s *Store) Get(key []byte) ([]byte, error) {
	value, closer, err := s.db.Get(key)
	if err != nil {
		if errors.Is(err, pebble.ErrNotFound) {
			return nil, nil
		}

		return nil, err
	}

	err = closer.Close()
	if err != nil {
		return nil, err
	}

	return value, nil
}

func (s *Store) Scan(keyRange kv.KeyRange, options kv.ScanOptions) ([]kv.KeyPair, error) {
	var keyPairs []kv.KeyPair

	// FIXME: oblige to `options`
	iter := s.db.NewIter(&pebble.IterOptions{
		LowerBound: keyRange.Start,
		UpperBound: keyRange.End,
	})
	defer iter.Close()

	// Scan all key/value pairs in the database
	for iter.First(); iter.Valid(); iter.Next() {
		iterKey := iter.Key()
		key := make([]byte, len(iterKey))
		copy(key, iterKey)

		value, err := iter.ValueAndErr()
		if err != nil {
			return nil, err
		}

		keyPairs = append(keyPairs, kv.KeyPair{Key: key, Value: value})
	}

	return keyPairs, iter.Error()
}

func (s *Store) Write(operations []kv.Write) error {
	s.mutex.Lock()
	defer s.mutex.Unlock()

	b := s.db.NewBatch()
	defer b.Close()

	for _, operation := range operations {
		if operation.Condition != nil {
			if operation.Condition.MustBeEmpty {
				value, err := s.Get(operation.Key)
				if err != nil {
					return err
				}

				if value != nil {
					return kv.ErrConditionalWriteFails
				}
			}
		}

		err := b.Set(operation.Key, operation.Value, nil)
		if err != nil {
			return err
		}
	}

	return b.Commit(pebble.Sync)
}
