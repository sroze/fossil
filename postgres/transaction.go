package postgres

import (
	"context"
	cloudevents "github.com/cloudevents/sdk-go"
	"github.com/sroze/fossil/store"
)

var transactionContextKey = "pgtx"

type CollectorWrappedInTransaction struct {
	decorated  store.Collector
	connection Transactionable
}

func NewCollectorWrappedInTransaction(decorated store.Collector, connection Transactionable) *CollectorWrappedInTransaction {
	return &CollectorWrappedInTransaction{
		decorated,
		connection,
	}
}

func (c *CollectorWrappedInTransaction) Collect(ctx context.Context, event *cloudevents.Event) error {
	t, err := c.connection.BeginEx(ctx, nil)
	if err != nil {
		return err
	}

	err = c.decorated.Collect(
		context.WithValue(ctx, transactionContextKey, t),
		event,
	)

	if err != nil {
		_ = t.Rollback()

		return err
	}

	return t.Commit()
}
