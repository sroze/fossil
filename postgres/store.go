package postgres

import (
	"context"
	"github.com/cloudevents/sdk-go"
	"github.com/jackc/pgx"
	"github.com/sirupsen/logrus"
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

func (s *Storage) hasEvent(t Queryable, ctx context.Context, stream string, sequenceNumber int) (bool, error) {
	rows, err := t.QueryEx(ctx, "SELECT 1 FROM events WHERE stream = $1 AND sequence_number_in_stream = $2", nil, stream, sequenceNumber)
	if err != nil {
		return false, err
	}

	defer rows.Close()
	return rows.Next(), nil
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
	var row *pgx.Row

	if expectedSequenceNumber := events.GetExpectedSequenceNumber(*event); expectedSequenceNumber > 0 {
		if expectedSequenceNumber > 1 {
			// We need to check for an event just before.
			hasPreviousEvent, err := s.hasEvent(t, ctx, stream, expectedSequenceNumber-1)
			if err != nil {
				return err
			}

			if !hasPreviousEvent {
				return &store.SequenceNumberDoNotMatchError{}
			}

		}

		row = t.QueryRowEx(
			ctx,
			"insert into events (id, stream, sequence_number_in_stream, event) values ($1, $2, $3, $4) "+upsert+" returning number, sequence_number_in_stream",
			nil,
			event.Context.GetID(),
			stream,
			expectedSequenceNumber,
			marshalled,
		)
	} else {
		row = t.QueryRowEx(
			ctx,
			"insert into events (id, stream, event) values ($1, $2, $3) "+upsert+" returning number, sequence_number_in_stream",
			nil,
			event.Context.GetID(),
			stream,
			marshalled,
		)
	}
	err = row.Scan(&number, &sequenceNumberInStream)

	if err != nil {
		if strings.Contains(err.Error(), "SQLSTATE 23505") {
			if strings.Contains(err.Error(), "events_unique_sequence_per_stream") {
				return &store.SequenceNumberDoNotMatchError{}
			}

			eventInStore, err := s.Find(ctx, event.ID())
			if err != nil {
				return err
			}

			return store.NewDuplicateEventError(*eventInStore)
		}
	}

	events.SetEventNumber(event, number)
	events.SetStream(event, stream)
	events.SetSequenceNumberInStream(event, sequenceNumberInStream)

	return err
}

func (s *Storage) MatchingStream(ctx context.Context, matcher events.Matcher) chan cloudevents.Event {
	l := logrus.WithFields(logrus.Fields{
		"matcher": matcher,
	})
	channel := make(chan cloudevents.Event)

	go func() {
		query, args := buildSelectQuery(matcher)
		rows, err := s.conn.QueryEx(ctx, query, nil, args...)
		if err != nil {
			l.Errorf("error went loading historical events: %s", err)

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
			l.Errorf("error going through rows: %s", err)
		}

		close(channel)
	}()

	return channel
}

func (s *Storage) Find(ctx context.Context, id string) (*cloudevents.Event, error) {
	row := s.conn.QueryRowEx(ctx, "select number, stream, sequence_number_in_stream, event from events where id = $1", nil, id)

	return rowToEvent(row)
}
