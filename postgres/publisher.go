package postgres

import (
	"context"
	"fmt"
	cloudevents "github.com/cloudevents/sdk-go"
	"github.com/jackc/pgx"
)

type Publisher struct {
	conn Execable
}

func NewPublisher(conn Execable) *Publisher {
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

	_, err = t.ExecEx(ctx, "select pg_notify('messages', $1)", nil, string(marshalled))

	return err
}
