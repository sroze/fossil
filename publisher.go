package fossil

import (
	"context"
	cloudevents "github.com/cloudevents/sdk-go"
)

type Publisher interface {
	Publish(context context.Context, event cloudevents.Event) error
}
