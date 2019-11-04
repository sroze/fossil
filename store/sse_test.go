package store

import (
	"bufio"
	"context"
	"fmt"
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
		query.Set("stream", "/visits/{id}")

		request, _ := http.NewRequestWithContext(ctx, http.MethodGet, "/sse?"+query.Encode(), nil)
		request.Header.Add("Accept", "text/event-stream")

		response := httptest.NewRecorder()
		go server.ServeHTTP(response, request)
		ExpectResponseCode(t, response, 200)

		// Wait for the stream listener to be registered
		time.Sleep(100 * time.Millisecond)

		stream := make(chan fossiltesting.ServerSentEvent)
		go fossiltesting.ReadServerSideEvents(bufio.NewReader(response.Body), stream)

		// ServerSentEvent is consumed
		event := events.NewEvent("123456", "/visits/1234", 1, 1)
		streamFactory.Source <- event

		// Receive an event
		received := <-stream
		if received.ID != event.ID() {
			fmt.Println(received)
			t.Errorf("received ID '%s' is different from sent '%s'", received.ID, event.ID())
		}

		cancel()
	})
}

func TestMatcherFromRequest(t *testing.T) {
	storage := NewInMemoryStorage()

	t.Run("it gets the template from query parameters", func(t *testing.T) {
		request, _ := http.NewRequest(http.MethodGet, "/sse?stream=foo", nil)
		request.Header.Add("Accept", "text/event-stream")

		matcher, err := matcherFromRequest(storage, request)
		if err != nil {
			t.Error(err)
			return
		}

		if len(matcher.UriTemplates) != 1 {
			t.Errorf("expected one template, got %d", len(matcher.UriTemplates))
		}
		if matcher.UriTemplates[0] != "foo" {
			t.Errorf("expected template to be foo, found %s instead", matcher.UriTemplates[0])
		}
	})

	t.Run("it gets multiple templates from query parameters", func(t *testing.T) {
		request, _ := http.NewRequest(http.MethodGet, "/sse?stream=foo&stream=bar", nil)
		request.Header.Add("Accept", "text/event-stream")

		matcher, err := matcherFromRequest(storage, request)
		if err != nil {
			t.Error(err)
			return
		}

		if len(matcher.UriTemplates) != 2 {
			t.Errorf("expected one template, got %d", len(matcher.UriTemplates))
		}
		if matcher.UriTemplates[0] != "foo" {
			t.Errorf("expected template to be foo, found %s instead", matcher.UriTemplates[0])
		}
		if matcher.UriTemplates[1] != "bar" {
			t.Errorf("expected template to be bar, found %s instead", matcher.UriTemplates[1])
		}
	})

	t.Run("last event number from headers", func(t *testing.T) {
		request, _ := http.NewRequest(http.MethodGet, "/sse?stream=foo", nil)
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
		event := events.NewEvent(uuid.New().String(), "some/stream", 0, 0)
		err := storage.Store(context.Background(), "some/stream", &event)
		if err != nil {
			t.Error(err)
			return
		}

		// Fake the event number
		events.SetEventNumber(&event, 10)

		request, _ := http.NewRequest(http.MethodGet, "/sse?stream=foo", nil)
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
