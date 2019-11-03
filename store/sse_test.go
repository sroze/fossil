package store

import (
	"bufio"
	"context"
	"github.com/google/uuid"
	"github.com/sroze/fossil/concurrency"
	"github.com/sroze/fossil/events"
	fossiltesting "github.com/sroze/fossil/testing"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"
	"time"
)

func TestSimpleEventStreaming(t *testing.T) {
	storage := NewInMemoryStorage()
	streamFactory := NewEventStreamFactory(storage)
	server := NewFossilServer(
		NewCollector(
			storage,
			NewInMemoryPublisher(),
		),
		streamFactory,
		storage,
		storage,
		concurrency.NewInMemoryLock(),
		"",
	)

	t.Run("streams consumed events", func(t *testing.T) {
		ctx, cancel := context.WithCancel(context.Background())

		query := url.Values{}
		query.Set("matcher", "/visits/*")

		request, _ := http.NewRequestWithContext(ctx, http.MethodGet, "/stream?"+query.Encode(), nil)
		request.Header.Add("Accept", "text/event-stream")

		response := httptest.NewRecorder()

		go server.ServeHTTP(response, request)

		// Wait for the stream listener to be registered
		time.Sleep(100 * time.Millisecond)

		events := make(chan fossiltesting.ServerSentEvent)
		go fossiltesting.ReadServerSideEvents(bufio.NewReader(response.Body), events)

		// ServerSentEvent is consumed
		event := fossiltesting.NewEvent("123456", "/visits/1234", 1, 1)
		streamFactory.Source <- event

		// Receive an event
		received := <-events
		if received.ID != event.ID() {
			t.Errorf("received ID %s is different from sent %s", received.ID, event.ID())
		}

		cancel()
	})
}

func TestMatcherFromRequest(t *testing.T) {
	storage := NewInMemoryStorage()

	t.Run("it gets the template from query parameters", func(t *testing.T) {
		request, _ := http.NewRequest(http.MethodGet, "/stream?matcher=foo", nil)
		request.Header.Add("Accept", "text/event-stream")

		matcher, err := matcherFromRequest(storage, request)
		if err != nil {
			t.Error(err)
			return
		}

		if matcher.UriTemplate != "foo" {
			t.Errorf("expected template to be foo, found %s instead", matcher.UriTemplate)
		}
	})

	t.Run("last event number from headers", func(t *testing.T) {
		request, _ := http.NewRequest(http.MethodGet, "/stream?matcher=foo", nil)
		request.Header.Add("Accept", "text/event-stream")
		request.Header.Add("Last-Fossil-Event-Number", "12")

		matcher, err := matcherFromRequest(storage, request)
		if err != nil {
			t.Error(err)
			return
		}

		if matcher.LastEventNumber != 12 {
			t.Errorf("expected last event number to be 12, found %d instead", matcher.LastEventNumber)
		}
	})

	t.Run("gets the last event number from the event id", func(t *testing.T) {
		event := fossiltesting.NewEvent(uuid.New().String(), "some/stream", 0, 0)
		err := storage.Store(context.Background(), "some/stream", &event)
		if err != nil {
			t.Error(err)
			return
		}

		// Fake the event number
		events.SetEventNumber(&event, 10)

		request, _ := http.NewRequest(http.MethodGet, "/stream?matcher=foo", nil)
		request.Header.Add("Accept", "text/event-stream")
		request.Header.Add("Last-Event-Id", event.ID())

		matcher, err := matcherFromRequest(storage, request)
		if err != nil {
			t.Error(err)
			return
		}

		if matcher.LastEventNumber != 10 {
			t.Errorf("expected last event number to be 10, found %d instead", matcher.LastEventNumber)
		}
	})
}
