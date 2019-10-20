package http

import (
	"bufio"
	"context"
	"github.com/sroze/fossil"
	"github.com/sroze/fossil/fossiltest"
	in_memory "github.com/sroze/fossil/in-memory"
	"github.com/sroze/fossil/streaming"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"
	"time"
)

func TestSimpleEventStreaming(t *testing.T) {
	storage := in_memory.NewInMemoryStorage()
	streamFactory := streaming.NewEventStreamFactory(storage)
	server := NewFossilServer(
		fossil.NewCollector(
			storage,
			in_memory.NewInMemoryPublisher(),
		),
		streamFactory,
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

		events := make(chan fossiltest.ServerSideEvent)
		go fossiltest.ReadServerSideEvents(bufio.NewReader(response.Body), events)

		// ServerSideEvent is consumed
		event := fossiltest.NewEvent("123456", "/visits/1234", 1, 1)
		streamFactory.Source <- event

		// Receive an event
		received := <- events
		if received.ID != event.ID() {
			t.Errorf("received ID %s is different from sent %s", received.ID, event.ID())
		}

		cancel()
	})
}
