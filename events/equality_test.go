package events

import (
	cloudevents "github.com/cloudevents/sdk-go"
	"github.com/google/uuid"
	"testing"
)

func ExpectEventsNotEqual(t *testing.T, left cloudevents.Event, right cloudevents.Event) {
	equals, err := EventsAreEquals(left, right)
	if err != nil {
		t.Error(err)
		return
	}

	if equals {
		t.Errorf("expected %s to be different from %s", left, right)
	}
}

func ExpectEventsEqual(t *testing.T, left cloudevents.Event, right cloudevents.Event) {
	equals, err := EventsAreEquals(left, right)
	if err != nil {
		t.Error(err)
		return
	}

	if !equals {
		t.Errorf("expected %s to be equal to %s", left, right)
	}
}

func TestEventsAreEquals(t *testing.T) {
	t.Run("if created equally", func(t *testing.T) {
		id := uuid.New().String()

		ExpectEventsEqual(
			t,
			NewEvent(id, "stream", 0, 0),
			NewEvent(id, "stream", 0, 0),
		)
	})

	t.Run("not if different event ids", func(t *testing.T) {
		left := NewEvent(uuid.New().String(), "stream", 0, 0)
		right := NewEvent(uuid.New().String(), "stream", 0, 0)

		ExpectEventsNotEqual(t, left, right)
	})

	t.Run("not if different data payload", func(t *testing.T) {
		id := uuid.New().String()
		left := NewEvent(id, "stream", 0, 0)
		left.SetData([]byte("foo"))
		right := NewEvent(id, "stream", 0, 0)
		left.SetData([]byte("bar"))

		ExpectEventsNotEqual(t, left, right)
	})

	t.Run("not if sent on different streams", func(t *testing.T) {
		id := uuid.New().String()

		ExpectEventsNotEqual(
			t,
			NewEvent(id, "stream/123", 0, 0),
			NewEvent(id, "stream/567", 0, 0),
		)
	})

	t.Run("not if expected number in stream is different", func(t *testing.T) {
		id := uuid.New().String()
		left := NewEvent(id, "stream", 0, 0)
		SetExpectedSequenceNumber(&left, 10)
		right := NewEvent(id, "stream", 0, 0)
		SetExpectedSequenceNumber(&right, 20)

		ExpectEventsNotEqual(t, left, right)
	})

	t.Run("not if number is different", func(t *testing.T) {
		id := uuid.New().String()
		ExpectEventsNotEqual(
			t,
			NewEvent(id, "stream/123", 1, 1),
			NewEvent(id, "stream/123", 2, 1),
		)
	})

	t.Run("if event number is 0 (i.e. default) on one side", func(t *testing.T) {
		id := uuid.New().String()
		ExpectEventsEqual(
			t,
			NewEvent(id, "stream/123", 2, 1),
			NewEvent(id, "stream/123", 0, 1),
		)
	})
}
