package store

import "github.com/apple/foundationdb/bindings/go/src/fdb"

type FoundationDBStore struct {
	db *fdb.Database
}

func NewStore(db fdb.Database) *FoundationDBStore {
	return &FoundationDBStore{
		db: &db,
	}
}
