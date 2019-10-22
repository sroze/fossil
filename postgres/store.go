package postgres

import (
	"context"
	"fmt"
	"github.com/cloudevents/sdk-go"
	"github.com/jackc/pgx"
	"github.com/sroze/fossil/events"
	"github.com/sroze/fossil/store"
	"strings"
)

type Storage struct {
	conn Queryable
}

func NewStorage(conn Queryable) *Storage {
	return &Storage{
		conn,
	}
}

type ReadableQueryResult interface {
	Scan(dest ...interface{}) (err error)
}

func rowToEvent(result ReadableQueryResult) (*cloudevents.Event, error) {
	var number int
	var sequenceNumberInStream int
	var stream string
	var eventAsBytes []byte

	err := result.Scan(&number, &stream, &sequenceNumberInStream, &eventAsBytes)
	if err != nil {
		return nil, err
	}

	event := cloudevents.Event{}
	err = event.UnmarshalJSON(eventAsBytes)
	if err != nil {
		return nil, err
	}

	events.SetEventNumber(&event, number)
	events.SetSequenceNumberInStream(&event, sequenceNumberInStream)
	events.SetStream(&event, stream)

	return &event, nil
}

func (s *Storage) Store(ctx context.Context, stream string, event *cloudevents.Event) error {
	var t Queryable
	t, ok := ctx.Value(transactionContextKey).(*pgx.Tx)
	if !ok {
		t = s.conn
	}

	marshalled, err := event.MarshalJSON()
	if err != nil {
		return err
	}

	// By default we don't upsert
	upsert := ""
	if events.IsReplacingAnotherEvent(*event) {
		upsert = "ON CONFLICT (id) DO UPDATE SET event = EXCLUDED.event"
	}

	var number int
	var sequenceNumberInStream int
	err = t.QueryRowEx(
		ctx,
		"insert into events (id, stream, event) values ($1, $2, $3) "+upsert+" returning number, sequence_number_in_stream",
		nil,
		event.Context.GetID(),
		stream,
		marshalled,
	).Scan(&number, &sequenceNumberInStream)

	if err != nil {
		if strings.Contains(err.Error(), "SQLSTATE 23505") {
			return &store.DuplicateEventError{}
		}
	}

	events.SetEventNumber(event, number)
	events.SetStream(event, stream)
	events.SetSequenceNumberInStream(event, sequenceNumberInStream)

	return err
}

func (s *Storage) MatchingStream(ctx context.Context, matcher events.Matcher) chan cloudevents.Event {
	channel := make(chan cloudevents.Event)

	go func() {
		streamAsRegex := "^" + strings.ReplaceAll(matcher.UriTemplate, "*", "[^\\/]*") + "$"
		rows, err := s.conn.QueryEx(ctx, "select number, stream, sequence_number_in_stream, event from events where number > $1 and stream ~ $2 order by number asc", nil, matcher.LastEventId, streamAsRegex)
		if err != nil {
			fmt.Println("error went loading historical events", err)
			close(channel)
			return
		}

		defer rows.Close()

		for rows.Next() {
			event, e := rowToEvent(rows)
			if e != nil {
				err = e

				break
			}

			channel <- *event
		}

		// Any errors encountered by rows.Next or rows.Scan will be returned here
		if rows.Err() != nil {
			fmt.Println("error going through rows", err)
		}

		close(channel)
	}()

	return channel
}

func (s *Storage) Get(ctx context.Context, id string) (*cloudevents.Event, error) {
	row := s.conn.QueryRowEx(ctx, "select number, stream, sequence_number_in_stream, event from events where id = $1", nil, id)

	return rowToEvent(row)
}
