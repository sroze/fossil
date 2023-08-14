package streamstore

import (
	"github.com/apple/foundationdb/bindings/go/src/fdb"
)

type SegmentStore struct {
	db *fdb.Database
}

func NewSegmentStore(db fdb.Database) *SegmentStore {
	return &SegmentStore{
		db: &db,
	}
}
