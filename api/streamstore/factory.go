package streamstore

import "github.com/apple/foundationdb/bindings/go/src/fdb"

type FoundationDBStore struct {
	Store

	db *fdb.Database
}

func NewFoundationStore(db fdb.Database) *FoundationDBStore {
	return &FoundationDBStore{
		db: &db,
	}
}
