package collector

import (
	"fmt"
	cloudevents "github.com/cloudevents/sdk-go"
	"net/url"
)

var typeToStreamPattern = map[string][]string {
	"https://acme.com/PersonCreated": {"person/{id}"},
}

func EventToStreams(event cloudevents.Event) ([]string, error) {
	streams := make([]string, 0)

	eventType := event.Context.GetType()
	_, err := url.Parse(eventType)
	if err != nil {
		return streams, fmt.Errorf("type %s is not a valid URI", eventType)
	}

	streams, exists := typeToStreamPattern[eventType]
	if !exists {
		return streams, fmt.Errorf("cannot get streams for type %s", eventType)
	}

	return streams, nil
}
