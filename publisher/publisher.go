package publisher

import cloudevents "github.com/cloudevents/sdk-go"

type Publisher interface {
	Publish(event cloudevents.Event) error
}
