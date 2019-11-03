// +build integration

package postgres

import (
	"context"
	"fmt"
	"github.com/google/uuid"
	"github.com/sroze/fossil/events"
	"github.com/sroze/fossil/store"
	fossiltesting "github.com/sroze/fossil/testing"
	"os"
	"strings"
	"testing"
)

func ExpectSequenceNumberDoNotMatchError(t *testing.T, err error) {
	if err == nil {
		t.Error("expected error while storing the event but got nothing")
	} else if _, isSequenceNumberError := err.(*store.SequenceNumberDoNotMatchError); !isSequenceNumberError {
		fmt.Println(err)
		t.Errorf("expected error to be a SequenceNumberDoNotMatchError error but found %T", err)
	}
}

func TestStorage(t *testing.T) {
	conn, err := NewPostgresConnection(
		os.Getenv("DATABASE_URL"),
	)

	if err != nil {
		t.Error(err)
		return
	}

	storage := NewStorage(conn)

	t.Run("stores and returns the event and sequence numbers", func(t *testing.T) {
		streamName := uuid.New().String()
		event := fossiltesting.NewEvent(uuid.New().String(), streamName, 0, 0)

		err := storage.Store(context.Background(), streamName, &event)
		if err != nil {
			t.Error(err)
			return
		}

		if events.GetEventNumber(event) == 0 {
			t.Error("expected event number, found 0")
		}
		if events.GetSequenceNumberInStream(event) == 0 {
			t.Error("expected sequence number, found 0")
		}
	})

	t.Run("returns a duplicate error if same event exists", func(t *testing.T) {
		streamName := uuid.New().String()
		id := uuid.New().String()
		event1 := fossiltesting.NewEvent(id, streamName, 0, 0)
		event2 := fossiltesting.NewEvent(id, streamName, 0, 0)

		err := storage.Store(context.Background(), streamName, &event1)
		if err != nil {
			t.Error(err)
			return
		}

		err = storage.Store(context.Background(), streamName, &event2)
		if _, ok := err.(*store.DuplicateEventError); !ok {
			t.Error("expected a duplicate event error")
		}
	})

	t.Run("overrides the event if explicitly stated", func(t *testing.T) {
		streamName := uuid.New().String()
		id := uuid.New().String()
		event1 := fossiltesting.NewEvent(id, streamName, 0, 0)
		event1.SetData("first")
		event2 := fossiltesting.NewEvent(id, streamName, 0, 0)
		event2.SetData("second")

		err := storage.Store(context.Background(), streamName, &event1)
		if err != nil {
			t.Error(err)
			return
		}

		events.SetEventToReplaceExistingOne(&event2)

		err = storage.Store(context.Background(), "foo/bar", &event2)
		if err != nil {
			t.Error(err)
			return
		}

		event, err := storage.Find(context.Background(), id)
		if err != nil {
			t.Error(err)
			return
		}

		stringAsBytes, ok := event.Data.([]byte)
		if !ok {
			t.Errorf("could not read data from %T", event.Data)
			return
		}

		if !strings.EqualFold(string(stringAsBytes), "\"second\"") {
			t.Errorf("expected data to be 'second' but found %s", event.Data)
		}
	})

	t.Run("it refuses an expected sequence number that is already existing in the stream", func(t *testing.T) {
		streamName := uuid.New().String()
		event1 := fossiltesting.NewEvent(uuid.New().String(), streamName, 0, 0)
		event1.SetData("first")

		err := storage.Store(context.Background(), streamName, &event1)
		if err != nil {
			t.Error(err)
			return
		}

		event1SequenceNumber := events.GetSequenceNumberInStream(event1)
		if event1SequenceNumber == 0 {
			t.Error("expected a sequence number but got 0")
			return
		}

		event2 := fossiltesting.NewEvent(uuid.New().String(), streamName, 0, 0)
		events.SetExpectedSequenceNumber(&event2, event1SequenceNumber)
		event2.SetData("second")

		ExpectSequenceNumberDoNotMatchError(t, storage.Store(context.Background(), streamName, &event2))
	})

	t.Run("it refuses an expected sequence number beyond what is already in the stream", func(t *testing.T) {
		streamName := uuid.New().String()
		event1 := fossiltesting.NewEvent(uuid.New().String(), streamName, 0, 0)
		event1.SetData("first")

		err := storage.Store(context.Background(), streamName, &event1)
		if err != nil {
			t.Error(err)
			return
		}

		event2 := fossiltesting.NewEvent(uuid.New().String(), streamName, 0, 0)
		events.SetExpectedSequenceNumber(&event2, 20)
		event2.SetData("second")

		ExpectSequenceNumberDoNotMatchError(t, storage.Store(context.Background(), streamName, &event2))
	})

	t.Run("it accepts the exact expected sequence number", func(t *testing.T) {
		streamName := uuid.New().String()
		event1 := fossiltesting.NewEvent(uuid.New().String(), streamName, 0, 0)
		event1.SetData("first")

		err := storage.Store(context.Background(), streamName, &event1)
		if err != nil {
			t.Error(err)
			return
		}

		event1SequenceNumber := events.GetSequenceNumberInStream(event1)
		if event1SequenceNumber == 0 {
			t.Error("expected a sequence number but got 0")
			return
		}

		event2 := fossiltesting.NewEvent(uuid.New().String(), streamName, 0, 0)
		events.SetExpectedSequenceNumber(&event2, event1SequenceNumber+1)
		event2.SetData("second")

		err = storage.Store(context.Background(), streamName, &event2)
		if err != nil {
			t.Error(err)
		}
	})
}
