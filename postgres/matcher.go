package postgres

import (
	"fmt"
	"github.com/sroze/fossil/events"
	"github.com/yosida95/uritemplate"
	"strings"
)

func uriTemplateAsPostgresRegex(uriTemplate string) string {
	streamAsRegex := "^" + uriTemplate + "$"

	template := uritemplate.MustNew(uriTemplate)
	for _, varName := range template.Varnames() {
		streamAsRegex = strings.ReplaceAll(streamAsRegex, "{"+varName+"}", "[^\\/]*")
	}

	return streamAsRegex
}

func buildSelectQuery(matcher events.Matcher) (string, []interface{}) {
	var args []interface{}
	args = append(args, matcher.LastEventNumber)

	var streamMatchersAsSql []string
	for index, uriTemplate := range matcher.UriTemplates {
		streamMatchersAsSql = append(streamMatchersAsSql, fmt.Sprintf("stream ~ $%d", index+2))
		args = append(args, uriTemplateAsPostgresRegex(uriTemplate))
	}

	streamsFilters := ""
	if len(streamMatchersAsSql) > 0 {
		streamsFilters = "and (" + strings.Join(streamMatchersAsSql, " or ") + ")"
	}

	return "select number, stream, sequence_number_in_stream, event from events where number > $1 " + streamsFilters + " order by number asc", args
}
