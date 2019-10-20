package fossil

import (
	"encoding/json"
	"fmt"
	cloudevents "github.com/cloudevents/sdk-go"
	"github.com/cloudevents/sdk-go/pkg/cloudevents/types"
)

var SequenceNumberInStreamExtensionName = "fossilsequenceinstream"
var eventNumberExtensionName = "fossileventnumber"
var streamExtensionName = "fossilstream"

func GetStreamFromEvent(event cloudevents.Event) string {
	return getStringFromExtension(event, streamExtensionName)
}

func SetStream(event *cloudevents.Event, stream string) {
	event.SetExtension(streamExtensionName, stream)
}

func SetEventNumber(event *cloudevents.Event, number int) {
	event.SetExtension(eventNumberExtensionName, number)
}

func GetEventNumber(event cloudevents.Event) int {
	return getIntegerFromExtension(event, eventNumberExtensionName)
}

func getStringFromExtension(event cloudevents.Event, extensionName string) string {
	extension := event.Extensions()[extensionName]

	var s string
	switch v := extension.(type) {
	case json.RawMessage:
		err := json.Unmarshal(v, &s)

		if err != nil {
			panic(err)
		}

		return s
	}

	s, err := types.ToString(extension)
	if err != nil {
		panic(fmt.Errorf("event did not have a number: %s | %s", event, err))
	}

	return s
}

func getIntegerFromExtension(event cloudevents.Event, extensionName string) int {
	extension := event.Extensions()[extensionName]

	var n int
	switch v := extension.(type) {
	case json.RawMessage:
		err := json.Unmarshal(v, &n)

		if err != nil {
			panic(err)
		}

		return n
	}

	number, err := types.ToInteger(extension)
	if err != nil {
		panic(fmt.Errorf("event did not have a number: %s | %s", event, err))
	}

	return int(number)
}
