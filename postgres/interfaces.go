package postgres

import (
	"context"
	"github.com/jackc/pgx"
)

type Transactionable interface {
	BeginEx(ctx context.Context, txOptions *pgx.TxOptions) (*pgx.Tx, error)
}

type Queryable interface {
	QueryEx(ctx context.Context, sql string, options *pgx.QueryExOptions, args ...interface{}) (rows *pgx.Rows, err error)
	QueryRowEx(ctx context.Context, sql string, options *pgx.QueryExOptions, args ...interface{}) *pgx.Row
}

type Execable interface {
	ExecEx(ctx context.Context, sql string, options *pgx.QueryExOptions, arguments ...interface{}) (commandTag pgx.CommandTag, err error)
}

// Errors
type DuplicateEventError struct{}

func (e *DuplicateEventError) Error() string {
	return "event with such identifier already exists."
}
