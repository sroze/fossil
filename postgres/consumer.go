package postgres

import (
	"context"
	cloudevents "github.com/cloudevents/sdk-go"
	"github.com/jackc/pgx"
	"github.com/sirupsen/logrus"
)

type Consumer struct {
	conn *pgx.Conn
}

func NewConsumer(url string) (*Consumer, error) {
	conn, err := NewPostgresConnection(url)
	if err != nil {
		return nil, err
	}

	return &Consumer{conn}, nil
}

func (c *Consumer) ConsumeFor(channel chan cloudevents.Event) {
	_, err := c.conn.ExecEx(context.Background(), "listen messages", nil)
	if err != nil {
		logrus.Errorf("could not initiate messages listener: %s", err)
		return
	}

	for {
		notification, _ := c.conn.WaitForNotification(context.Background())

		// Note: we are not using `err` because for whatever reason `err != nil` is false...
		if notification != nil {
			event := cloudevents.Event{}
			err := event.UnmarshalJSON([]byte(notification.Payload))

			if err != nil {
				logrus.Errorf("could not de-serialize event: %s", err)
				continue
			}

			channel <- event
		}
	}
}
