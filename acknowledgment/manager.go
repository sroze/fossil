package acknowledgment

import (
	"context"
	"fmt"
	"github.com/segmentio/kafka-go"
	"time"
)

type AcknowledgementManager struct {
	Broadcaster *StringChannelBroadcaster
}

func NewAcknowledgementManager() *AcknowledgementManager {
	broadcaster := NewStringChannelBroadcaster(0)

	// TODO: acknowledgement-topic to be delete over the last minute or so (i.e. max timeout)
	r := kafka.NewReader(kafka.ReaderConfig{
		Brokers:   []string{"localhost:9092"},
		Topic:     "acknowledgement-topic",
		MaxWait: 20 * time.Millisecond,
	})

	go func() {
		for {
			m, err := r.ReadMessage(context.Background())
			if err != nil {
				fmt.Printf("could not read message: %s\n", err.Error())
				break
			}

			broadcaster.Source <- string(m.Value)
		}

		err := r.Close()
		if err != nil {
			fmt.Printf("Could not close connection: %s", err)
		}

		fmt.Print("Acknowledgment listener stopped")
	}()

	return &AcknowledgementManager{
		Broadcaster: broadcaster,
	}
}
