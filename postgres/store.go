package postgres

import (
	"context"
	"fmt"
	"github.com/cloudevents/sdk-go"
	"github.com/jackc/pgx"
	"github.com/sroze/fossil"
	"strings"
)

type Storage struct {
	conn *pgx.Conn
}

func NewStorage(conn *pgx.Conn) *Storage {
	return &Storage{
		conn,
	}
}

func (s *Storage) Store(ctx context.Context, stream string, event *cloudevents.Event) error {
	t, ok := ctx.Value(transactionContextKey).(*pgx.Tx)
	if !ok {
		return fmt.Errorf("transaction not found in context")
	}

	var number int
	var sequenceNumberInStream int
	err := t.QueryRowEx(
		ctx,
		"insert into events (id, stream, event) values ($1, $2, $3) returning number, sequence_number_in_stream",
		nil,
		event.Context.GetID(),
		stream,
		event.Data,
	).Scan(&number, &sequenceNumberInStream)

	if err != nil {
		if strings.Contains(err.Error(), "SQLSTATE 23505") {
			return &fossil.DuplicateEventError{}
		}
	}

	fossil.SetEventNumber(event, number)
	event.SetExtension(fossil.StreamExtensionName, stream)
	event.SetExtension(fossil.SequenceNumberInStreamExtensionName, sequenceNumberInStream)

	return err
}

func (s *Storage) MatchingStream(ctx context.Context, matcher string) chan cloudevents.Event {
	channel := make(chan cloudevents.Event)

	go func() {
		// TODO: Integration test for this lovely one!
		streamAsRegex := "^" + strings.ReplaceAll(matcher, "*", "[^\\/]") + "$"

		rows, err := s.conn.QueryEx(ctx, "select number, stream, sequence_number_in_stream, event from events where stream ~ $1 order by number asc", nil, streamAsRegex)
		if err != nil {
			fmt.Println("error went loading historical events", err)
			close(channel)
			return
		}

		defer rows.Close()

		for rows.Next() {
			var number int
			var sequenceNumberInStream int
			var stream string
			var event cloudevents.Event

			err = rows.Scan(&number, &stream, &sequenceNumberInStream, &event)
			if err != nil {
				break
			}

			fossil.SetEventNumber(&event, number)
			event.SetExtension(fossil.SequenceNumberInStreamExtensionName, sequenceNumberInStream)
			event.SetExtension(fossil.StreamExtensionName, stream)

			channel <- event
		}

		// Any errors encountered by rows.Next or rows.Scan will be returned here
		if rows.Err() != nil {
			fmt.Println("error going through rows", err)
		}

		close(channel)
	}()

	return channel
}
