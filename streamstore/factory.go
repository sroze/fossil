package streamstore

import "github.com/apple/foundationdb/bindings/go/src/fdb"

type FoundationDBStore struct {
	Store

	db    *fdb.Database
	hooks Hooks
}

type Hooks struct {
	OnWrite func(t fdb.Transaction, writes []AppendToStream, results []AppendResult) error
}

func NewFoundationStoreWithHooks(db fdb.Database, hooks Hooks) *FoundationDBStore {
	return &FoundationDBStore{
		db:    &db,
		hooks: hooks,
	}
}

func NewFoundationStore(db fdb.Database) *FoundationDBStore {
	return NewFoundationStoreWithHooks(db, Hooks{})
}
