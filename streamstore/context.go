package streamstore

import (
	"context"
	"github.com/apple/foundationdb/bindings/go/src/fdb"
)

var TransactionContextKey = "transaction"

func WithTransaction(ctx context.Context, t fdb.ReadTransaction) context.Context {
	return context.WithValue(ctx, TransactionContextKey, t)
}

func GetTransaction(ctx context.Context) (fdb.ReadTransaction, bool) {
	t, ok := ctx.Value(TransactionContextKey).(fdb.ReadTransaction)

	return t, ok
}
