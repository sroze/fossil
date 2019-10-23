package postgres

import (
	"context"
	"github.com/jackc/pgx"
	"github.com/sroze/fossil/concurrency"
	"hash/fnv"
	"time"
)

type Lock struct {
	pool         *pgx.ConnPool
	inMemoryLock *concurrency.InMemoryLock
}

func NewLock(pool *pgx.ConnPool) *Lock {
	return &Lock{
		pool,
		concurrency.NewInMemoryLock(),
	}
}

func stringToUint32(s string) (uint32, error) {
	h := fnv.New32a()
	_, err := h.Write([]byte(s))
	if err != nil {
		return 0, err
	}

	return h.Sum32(), nil
}

func (l *Lock) Lock(ctx context.Context, identifier string) error {
	err := l.inMemoryLock.Lock(ctx, identifier)
	if err != nil {
		return err
	}

	numberedIdentifier, err := stringToUint32(identifier)
	if err != nil {
		return err
	}

	locked := false
	for !locked {
		err = l.pool.QueryRowEx(ctx, "select pg_try_advisory_lock($1)", nil, numberedIdentifier).Scan(&locked)
		if err != nil {
			return err
		}

		if !locked {
			time.Sleep(50 * time.Millisecond)
		}
	}

	return nil
}

func (l *Lock) Release(identifier string) error {
	err := l.inMemoryLock.Release(identifier)
	numberedIdentifier, err := stringToUint32(identifier)
	if err != nil {
		return err
	}

	_, err = l.pool.ExecEx(context.Background(), "select pg_advisory_unlock($1)", nil, numberedIdentifier)

	return err
}
