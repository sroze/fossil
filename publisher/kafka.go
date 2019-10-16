package publisher


import (
	"fmt"
	cloudevents "github.com/cloudevents/sdk-go"
	"gopkg.in/confluentinc/confluent-kafka-go.v1/kafka"
	"os"
)

type KafkaPublisher struct {
	producer *kafka.Producer
}

func NewKafkaPublisher() (*KafkaPublisher, error) {
	producer, err := kafka.NewProducer(&kafka.ConfigMap{
		"bootstrap.servers": os.Getenv("KAFKA_BROKERS"),
		"sasl.username": os.Getenv("KAFKA_USERNAME"),
		"sasl.password": os.Getenv("KAFKA_PASSWORD"),
		"api.version.request": true,
		"broker.version.fallback": "0.10.0.0",
		"api.version.fallback.ms": 0,
		"sasl.mechanisms": "PLAIN",
		"security.protocol": "SASL_SSL",
		"ssl.ca.location": "/usr/local/etc/openssl/cert.pem",
	})

	if err != nil {
		return nil, err
	}

	return &KafkaPublisher{
		producer,
	}, nil
}

func (p *KafkaPublisher) Publish(event cloudevents.Event) error {
	fmt.Println("Publishing...")

	topic := "test-topic"
	doneChan := make(chan bool)

	go func() {
		defer close(doneChan)
		for e := range p.producer.Events() {
			switch ev := e.(type) {
			case *kafka.Message:
				m := ev
				if m.TopicPartition.Error != nil {
					fmt.Printf("Delivery failed: %v\n", m.TopicPartition.Error)
				} else {
					fmt.Printf("Delivered message to topic %s [%d] at offset %v\n",
						*m.TopicPartition.Topic, m.TopicPartition.Partition, m.TopicPartition.Offset)
				}
				return

			default:
				fmt.Printf("Ignored event: %s\n", ev)
			}
		}
	}()

	fmt.Println("Publishing...")

	value := "Hello Go!"
	p.producer.ProduceChannel() <- &kafka.Message{
		TopicPartition: kafka.TopicPartition{Topic: &topic, Partition: kafka.PartitionAny},
		Value: []byte(value),
	}

	fmt.Println("Waiting...")
	// wait for delivery report goroutine to finish
	_ = <-doneChan

	fmt.Println("Done...")

	return nil
}
