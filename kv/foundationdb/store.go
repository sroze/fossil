package foundationdb

import (
	"github.com/apple/foundationdb/bindings/go/src/fdb"
	"github.com/sroze/fossil/kv"
)

type Store struct {
	db *fdb.Database
}

func NewStore(db fdb.Database) *Store {
	return &Store{db: &db}
}

func (s *Store) Get(key []byte) ([]byte, error) {
	value, err := s.db.ReadTransact(func(transaction fdb.ReadTransaction) (interface{}, error) {
		return transaction.Get(fdb.Key(key)).MustGet(), nil
	})

	if err != nil {
		return nil, err
	}

	return value.([]byte), nil
}

func (s *Store) Write(operations []kv.Write) error {
	_, err := s.db.Transact(func(transaction fdb.Transaction) (interface{}, error) {
		// TODO (perf): parallelize these operations!
		for _, operation := range operations {
			if operation.Condition != nil {
				if operation.Condition.MustBeEmpty {
					value := transaction.Get(fdb.Key(operation.Key)).MustGet()

					if value != nil {
						return nil, kv.ErrConditionalWriteFails{
							Condition:  operation.Condition,
							Key:        operation.Key,
							FoundValue: value,
						}
					}
				}
			}

			if operation.Value == nil {
				transaction.Clear(fdb.Key(operation.Key))
			} else {
				transaction.Set(fdb.Key(operation.Key), operation.Value)
			}
		}

		return nil, nil
	})

	if err != nil {
		return err
	}

	return nil
}

func (s *Store) Scan(keyRange kv.KeyRange, options kv.ScanOptions, ch chan kv.KeyPair) error {
	defer close(ch)

	_, err := s.db.ReadTransact(func(t fdb.ReadTransaction) (interface{}, error) {
		ri := t.GetRange(fdb.KeyRange{
			Begin: fdb.Key(keyRange.Start),
			End:   fdb.Key(keyRange.End),
		}, fdb.RangeOptions{
			Reverse: options.Backwards,
			Limit:   options.Limit,
		}).Iterator()

		for ri.Advance() {
			row := ri.MustGet()

			// Check that the context is not done before continuing.
			// select {
			// case <-ctx.Done():
			// 	break
			// default:
			// }
			ch <- kv.KeyPair{
				Key:   row.Key,
				Value: row.Value,
			}
		}

		return nil, nil
	})

	return err
}
