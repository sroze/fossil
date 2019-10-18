package postgres

import (
	"context"
	"fmt"
	"github.com/cloudevents/sdk-go"
	"github.com/jackc/pgx"
	"github.com/sroze/fossil"
	"strings"
)

type Storage struct {
	conn *pgx.Conn
}

func NewStorage(conn *pgx.Conn) *Storage {
	return &Storage{
		conn,
	}
}

func (s *Storage) Store(ctx context.Context, stream string, event cloudevents.Event) error {
	t, ok := ctx.Value(transactionContextKey).(*pgx.Tx)
	if !ok {
		return fmt.Errorf("transaction not found in context")
	}

	_, err := t.Exec(
		"insert into events (id, stream, event) values ($1, $2, $3)",
		event.Context.GetID(),
		stream,
		event.Data,
	)

	if err != nil {
		if strings.Contains(err.Error(), "SQLSTATE 23505") {
			return &fossil.DuplicateEventError{}
		}
	}

	return err
}
