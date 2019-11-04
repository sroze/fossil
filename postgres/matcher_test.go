package postgres

import (
	"github.com/sroze/fossil/events"
	"testing"
)

func expectBuiltSelectQuery(t *testing.T, matcher events.Matcher, expectedSql string, expectedArgs []interface{}) {
	sql, args := buildSelectQuery(matcher)

	if sql != expectedSql {
		t.Errorf("expected SQL is '%s' but got '%s'", expectedSql, sql)
	}

	if len(args) != len(expectedArgs) {
		t.Errorf("expected %d args, got %d", len(expectedArgs), len(args))
	}

	for index, expectedValue := range expectedArgs {
		if args[index] != expectedValue {
			t.Errorf("expected value '%s', got '%s'", expectedValue, args[index])
		}
	}
}

func TestBuildSqlQuery(t *testing.T) {
	t.Run("no stream templates, no last event", func(t *testing.T) {
		expectBuiltSelectQuery(
			t,
			events.Matcher{
				UriTemplates:    []string{},
				LastEventNumber: 0,
			},
			"select number, stream, sequence_number_in_stream, event from events where number > $1  order by number asc",
			[]interface{}{
				0,
			},
		)
	})

	t.Run("no stream template, with last event", func(t *testing.T) {
		expectBuiltSelectQuery(
			t,
			events.Matcher{
				UriTemplates:    []string{},
				LastEventNumber: 10,
			},
			"select number, stream, sequence_number_in_stream, event from events where number > $1  order by number asc",
			[]interface{}{
				10,
			},
		)
	})

	t.Run("one stream template and no last event", func(t *testing.T) {
		expectBuiltSelectQuery(
			t,
			events.Matcher{
				UriTemplates:    []string{"foo/bar"},
				LastEventNumber: 0,
			},
			"select number, stream, sequence_number_in_stream, event from events where number > $1 and (stream ~ $2) order by number asc",
			[]interface{}{
				0,
				"^foo/bar$",
			},
		)
	})

	t.Run("three stream templates and a last event", func(t *testing.T) {
		expectBuiltSelectQuery(
			t,
			events.Matcher{
				UriTemplates:    []string{"foo/bar", "visits/{id}", "care-recipients/{cr_id}/something-else"},
				LastEventNumber: 10,
			},
			"select number, stream, sequence_number_in_stream, event from events where number > $1 and (stream ~ $2 or stream ~ $3 or stream ~ $4) order by number asc",
			[]interface{}{
				10,
				"^foo/bar$",
				"^visits/[^\\/]*$",
				"^care-recipients/[^\\/]*/something-else$",
			},
		)
	})
}
