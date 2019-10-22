// +build integration

package postgres

import (
	"context"
	"github.com/google/uuid"
	"github.com/sroze/fossil/fossiltest"
	"github.com/sroze/fossil/streaming"
	"os"
	"strings"
	"testing"
)

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
		event := fossiltest.NewEvent(
			uuid.New().String(),
			"foo/bar",
			1, 1)

		err := storage.Store(context.Background(), "foo/bar", &event)
		if err != nil {
			t.Error(err)
			return
		}

		if streaming.GetEventNumber(event) == 0 {
			t.Error("expected event number, found 0")
		}
	})

	t.Run("returns a duplicate error if same event exists", func(t *testing.T) {
		id := uuid.New().String()
		event1 := fossiltest.NewEvent(id, "foo/bar", 1, 1)
		event2 := fossiltest.NewEvent(id, "foo/bar", 2, 2)

		err := storage.Store(context.Background(), "foo/bar", &event1)
		if err != nil {
			t.Error(err)
			return
		}

		err = storage.Store(context.Background(), "foo/bar", &event2)
		if _, ok := err.(*DuplicateEventError); !ok {
			t.Error("expected a duplicate event error")
		}
	})

	t.Run("overrides the event if explicitly stated", func(t *testing.T) {
		id := uuid.New().String()
		event1 := fossiltest.NewEvent(id, "foo/bar", 1, 1)
		event1.SetData("first")
		event2 := fossiltest.NewEvent(id, "foo/bar", 2, 2)
		event2.SetData("second")

		err := storage.Store(context.Background(), "foo/bar", &event1)
		if err != nil {
			t.Error(err)
			return
		}

		streaming.SetEventToReplaceExistingOne(&event2)

		err = storage.Store(context.Background(), "foo/bar", &event2)
		if err != nil {
			t.Error(err)
			return
		}

		event, err := storage.Get(context.Background(), id)
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
}
