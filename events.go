package fossil

import (
	"encoding/json"
	"fmt"
	cloudevents "github.com/cloudevents/sdk-go"
	"github.com/cloudevents/sdk-go/pkg/cloudevents/types"
	"github.com/gobwas/glob"
)

// TODO: Do not expose these extension names but expose helpers!
var SequenceNumberInStreamExtensionName = "fossilsequenceinstream"
var eventNumberExtensionName = "fossileventnumber"
var StreamExtensionName = "fossilstream"

func StreamMatches(stream string, matcher string) bool {
	return glob.MustCompile(matcher).Match(stream)
}

func SetEventNumber(event *cloudevents.Event, number int) {
	event.SetExtension(eventNumberExtensionName, number)
}

func GetEventNumber(event cloudevents.Event) int {
	extension := event.Extensions()[eventNumberExtensionName]

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
