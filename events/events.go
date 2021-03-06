package events

import (
	"encoding/json"
	cloudevents "github.com/cloudevents/sdk-go"
	"github.com/cloudevents/sdk-go/pkg/cloudevents/types"
	"github.com/sirupsen/logrus"
	"github.com/yosida95/uritemplate"
	"strings"
)

var SequenceNumberInStreamExtensionName = "fossilsequenceinstream"
var eventNumberExtensionName = "fossileventnumber"
var streamExtensionName = "fossilstream"
var toReplaceExistingEventExtensionName = "fossiltoreplaceexistingevent"
var expectedSequenceNumberExtensionName = "fossilexpectedsequencenumber"
var consumersWaitedForAcknowledgmentExtensionName = "fossilconsumerswaitedforacknowledgment"

type Matcher struct {
	UriTemplates    []string
	LastEventNumber int
}

func GetStreamFromEvent(event cloudevents.Event) string {
	return getStringFromExtension(event, streamExtensionName)
}

func SetStream(event *cloudevents.Event, stream string) {
	event.SetExtension(streamExtensionName, stream)
}

func GetConsumersWaitedForAcknowledgmentFromEvent(event cloudevents.Event) []string {
	return strings.Split(getStringFromExtension(event, consumersWaitedForAcknowledgmentExtensionName), ",")
}

func SetConsumersWaitedForAcknowledgmentFromEvent(event *cloudevents.Event, consumers []string) {
	event.SetExtension(consumersWaitedForAcknowledgmentExtensionName, strings.Join(consumers, ","))
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
	l := logrus.WithFields(logrus.Fields{
		"event":         event,
		"extensionName": extensionName,
	})

	extension := event.Extensions()[extensionName]

	var s string
	switch v := extension.(type) {
	case json.RawMessage:
		err := json.Unmarshal(v, &s)

		if err != nil {
			l.Panicf("could not unmarshal extension value: %s", err)

			return ""
		}

		return s
	}

	s, err := types.ToString(extension)
	if err != nil {
		l.Panicf("could not get string for extension: %s", err)
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
			logrus.WithFields(logrus.Fields{
				"event":         event,
				"extensionName": extensionName,
			}).Panicf("could not unmarshal integer: %s", err)

			return 0
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

	for _, template := range matcher.UriTemplates {
		template, err := uritemplate.New(template)
		if err != nil {
			logrus.WithField("matcher", matcher).Errorf("URI template is invalid: %s", err.Error())
			continue
		}

		if template.Match(stream) != nil {
			return GetEventNumber(event) > matcher.LastEventNumber
		}
	}

	return false
}
