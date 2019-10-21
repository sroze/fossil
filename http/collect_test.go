package http

import (
	"github.com/sroze/fossil"
	"github.com/sroze/fossil/in-memory"
	"github.com/sroze/fossil/streaming"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func ExpectResponseCode(t *testing.T, response *httptest.ResponseRecorder, expect int) {
	got := response.Code

	if got != expect {
		t.Errorf("got %d, want %d", got, expect)
		t.Errorf("response: %q", response.Body.String())
	}
}

func TestCollectEvent(t *testing.T) {
	storage := in_memory.NewInMemoryStorage()
	server := NewFossilServer(
		fossil.NewCollector(
			storage,
			in_memory.NewInMemoryPublisher(),
		),
		streaming.NewEventStreamFactory(storage),
	)

	t.Run("rejects invalid events", func(t *testing.T) {
		body := strings.NewReader("{\"mood\": \"happy\"}")

		request, _ := http.NewRequest(http.MethodPost, "/collect", body)
		request.Header.Add("ce-specversion", "0.3")
		request.Header.Add("Content-Type", "application/json; charset=utf-8")

		response := httptest.NewRecorder()

		server.ServeHTTP(response, request)

		ExpectResponseCode(t, response, 400)
	})

	t.Run("successfully collects a valid event", func(t *testing.T) {
		body := strings.NewReader("{\"mood\": \"happy\"}")

		request, _ := http.NewRequest(http.MethodPost, "/collect", body)
		request.Header.Add("ce-specversion", "0.3")
		request.Header.Add("ce-type", "https://acme.com/PersonCreated")
		request.Header.Add("ce-time", "2018-04-05T03:56:24Z")
		request.Header.Add("ce-id", "1234-1234-1234")
		request.Header.Add("ce-source", "birdie.care")
		request.Header.Add("fossil-stream", "person/1234")
		request.Header.Add("Content-Type", "application/json; charset=utf-8")

		response := httptest.NewRecorder()

		server.ServeHTTP(response, request)

		ExpectResponseCode(t, response, 200)

		eventNumber := response.Header().Get("fossil-event-number")
		if eventNumber == "" {
			t.Error("expected the event number as response but found nothing")
		}
	})
	
	t.Run("error when the event already exists", func(t *testing.T) {
		body := strings.NewReader("{\"mood\": \"happy again\"}")

		request, _ := http.NewRequest(http.MethodPost, "/collect", body)
		request.Header.Add("ce-specversion", "0.3")
		request.Header.Add("ce-type", "https://acme.com/PersonCreated")
		request.Header.Add("ce-time", "2018-04-05T03:56:24Z")
		request.Header.Add("ce-id", "1234-1234-1234")
		request.Header.Add("ce-source", "birdie.care")
		request.Header.Add("fossil-stream", "person/1234")
		request.Header.Add("Content-Type", "application/json; charset=utf-8")

		response := httptest.NewRecorder()

		server.ServeHTTP(response, request)

		ExpectResponseCode(t, response, 400)
	})
	
	t.Run("can override an event", func(t *testing.T) {
		body := strings.NewReader("{\"mood\": \"happy again; replaced this time\"}")

		request, _ := http.NewRequest(http.MethodPost, "/collect", body)
		request.Header.Add("ce-specversion", "0.3")
		request.Header.Add("ce-type", "https://acme.com/PersonCreated")
		request.Header.Add("ce-time", "2018-04-05T03:56:24Z")
		request.Header.Add("ce-id", "1234-1234-1234")
		request.Header.Add("ce-source", "birdie.care")
		request.Header.Add("fossil-stream", "person/1234")
		request.Header.Add("fossil-replace", "true")
		request.Header.Add("Content-Type", "application/json; charset=utf-8")

		response := httptest.NewRecorder()

		server.ServeHTTP(response, request)

		ExpectResponseCode(t, response, 200)
	})
}
