package fossil

import (
	cloudevents "github.com/cloudevents/sdk-go"
	"github.com/gobwas/glob"
)

type Matcher struct {
	UriTemplate string
	LastEventId int
}

func EventMatches(event cloudevents.Event, matcher Matcher) bool {
	stream := GetStreamFromEvent(event)

	if !glob.MustCompile(matcher.UriTemplate).Match(stream) {
		return false
	}

	return GetEventNumber(event) > matcher.LastEventId
}
