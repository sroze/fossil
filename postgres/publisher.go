package postgres

import (
	"context"
	"fmt"
	cloudevents "github.com/cloudevents/sdk-go"
	"github.com/jackc/pgx"
)

type Publisher struct {
	conn *pgx.Conn
}

func NewPublisher(conn *pgx.Conn) *Publisher {
	return &Publisher{
		conn,
	}
}

func (p *Publisher) Publish(ctx context.Context, stream string, event *cloudevents.Event) error {
	t, ok := ctx.Value(transactionContextKey).(*pgx.Tx)
	if !ok {
		return fmt.Errorf("transaction not found in context")
	}

	marshalled, err := event.MarshalJSON()
	if err != nil {
		return err
	}

	_, err = t.Exec("select pg_notify('messages', $1)", string(marshalled))

	return err
}
