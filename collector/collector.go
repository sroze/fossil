package collector

import (
	cloudevents "github.com/cloudevents/sdk-go"
	"github.com/sroze/fossil/publisher"
	"github.com/sroze/fossil/storage"
)

type Collector struct {
	store storage.EventStore
	publisher publisher.Publisher
}

func NewCollector(store storage.EventStore, publisher publisher.Publisher) *Collector {
	return &Collector{
		store,
		publisher,
	}
}

func (c *Collector) Collect(event cloudevents.Event) error {
	transaction, err := c.store.NewTransaction()
	if err != nil {
		return err
	}

	// Store the event in its streams
	streams, err := EventToStreams(event)
	if err != nil {
		return err
	}

	for _, stream := range streams {
		err := transaction.Store(stream, event)

		if err != nil {
			transaction.Rollback()

			return err
		}
	}

	// Publish the message
	err = c.publisher.Publish(event)
	if err != nil {
		return err
	}

	// Commit
	return transaction.Commit()
}
