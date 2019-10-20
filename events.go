package fossil

import (
	"fmt"
	cloudevents "github.com/cloudevents/sdk-go"
	"github.com/cloudevents/sdk-go/pkg/cloudevents/types"
	"github.com/gobwas/glob"
)

// TODO: Do not expose these extension names but expose helpers!
var SequenceNumberInStreamExtensionName = "FossilSequenceInStream"
var eventNumberExtensionName = "FossilEventNumber"
var StreamExtensionName = "fossilStream"

func StreamMatches(stream string, matcher string) bool {
	return glob.MustCompile(matcher).Match(stream)
}

func SetEventNumber(event *cloudevents.Event, number int) {
	event.SetExtension(eventNumberExtensionName, number)
}

func GetEventNumber(event cloudevents.Event) int {
	number, err := types.ToInteger(event.Extensions()[eventNumberExtensionName])
	if err != nil {
		panic(fmt.Errorf("event did not have a number: %s | %s", event, err))
	}

	return int(number)
}
