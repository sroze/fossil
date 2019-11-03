package events

import (
	"encoding/json"
	"fmt"
	cloudevents "github.com/cloudevents/sdk-go"
	"github.com/cloudevents/sdk-go/pkg/cloudevents/types"
	"github.com/gobwas/glob"
)

var SequenceNumberInStreamExtensionName = "fossilsequenceinstream"
var eventNumberExtensionName = "fossileventnumber"
var streamExtensionName = "fossilstream"
var toReplaceExistingEventExtensionName = "fossiltoreplaceexistingevent"
var expectedSequenceNumberExtensionName = "fossilexpectedsequencenumber"

type Matcher struct {
	UriTemplate     string
	LastEventNumber int
}

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

func SetSequenceNumberInStream(event *cloudevents.Event, number int) {
	event.SetExtension(SequenceNumberInStreamExtensionName, number)
}

func GetSequenceNumberInStream(event cloudevents.Event) int {
	return getIntegerFromExtension(event, SequenceNumberInStreamExtensionName)
}

func SetEventToReplaceExistingOne(event *cloudevents.Event) {
	event.SetExtension(toReplaceExistingEventExtensionName, 1)
}

func SetExpectedSequenceNumber(event *cloudevents.Event, number int) {
	event.SetExtension(expectedSequenceNumberExtensionName, number)
}

func GetExpectedSequenceNumber(event cloudevents.Event) int {
	return getIntegerFromExtension(event, expectedSequenceNumberExtensionName)
}

func IsReplacingAnotherEvent(event cloudevents.Event) bool {
	return getIntegerFromExtension(event, toReplaceExistingEventExtensionName) == 1
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
		panic(fmt.Errorf("could not get string for extension %s | %s | %s", extensionName, event, err))
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
		return 0
	}

	return int(number)
}

func EventMatches(event cloudevents.Event, matcher Matcher) bool {
	stream := GetStreamFromEvent(event)

	if !glob.MustCompile(matcher.UriTemplate).Match(stream) {
		return false
	}

	return GetEventNumber(event) > matcher.LastEventNumber
}
