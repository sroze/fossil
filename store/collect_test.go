package store

import (
	"context"
	"github.com/google/uuid"
	"github.com/sroze/fossil/concurrency"
	"github.com/sroze/fossil/events"
	"net/http"
	"net/http/httptest"
	"strconv"
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
	storage := NewInMemoryStorage()
	server := NewFossilServer(
		NewCollector(
			storage,
			NewInMemoryPublisher(),
		),
		NewEventStreamFactory(storage),
		storage,
		storage,
		concurrency.NewInMemoryLock(),
		"",
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

	t.Run("accepts when sent the exact same event so that collection is idempotent", func(t *testing.T) {
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

	t.Run("error when an event with the same identifier but different body exists", func(t *testing.T) {
		body := strings.NewReader("{\"mood\": \"happy but has changed\"}")

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

		ExpectResponseCode(t, response, 409)
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

	t.Run("rejects an event if the expected number is not matching", func(t *testing.T) {
		body := strings.NewReader("{\"mood\": \"very-happy\"}")

		request, _ := http.NewRequest(http.MethodPost, "/collect", body)
		request.Header.Add("ce-specversion", "0.3")
		request.Header.Add("ce-type", "https://acme.com/PersonCreated")
		request.Header.Add("ce-time", "2018-04-05T03:56:24Z")
		request.Header.Add("ce-id", uuid.New().String())
		request.Header.Add("ce-source", "birdie.care")
		request.Header.Add("fossil-stream", "person/1234")
		request.Header.Add("fossil-expected-sequence-number", "12349813") // Unrealistic number
		request.Header.Add("Content-Type", "application/json; charset=utf-8")

		response := httptest.NewRecorder()

		server.ServeHTTP(response, request)

		ExpectResponseCode(t, response, 409)
	})

	t.Run("accepts an event if its identifier is matching the one given", func(t *testing.T) {
		body := strings.NewReader("{\"mood\": \"okay\"}")

		// Successfully collect an event
		request, _ := http.NewRequest(http.MethodPost, "/collect", body)
		request.Header.Add("ce-specversion", "0.3")
		request.Header.Add("ce-type", "https://acme.com/PersonCreated")
		request.Header.Add("ce-time", "2018-04-05T03:56:24Z")
		request.Header.Add("ce-id", uuid.New().String())
		request.Header.Add("ce-source", "birdie.care")
		request.Header.Add("fossil-stream", "person/1234")
		request.Header.Add("Content-Type", "application/json; charset=utf-8")

		response := httptest.NewRecorder()
		server.ServeHTTP(response, request)
		ExpectResponseCode(t, response, 200)

		sequenceNumber, err := strconv.Atoi(response.Header().Get("fossil-sequence-number"))
		if err != nil || sequenceNumber == 0 {
			t.Errorf("expected event number but got %d (or error: %s)", sequenceNumber, err)
			return
		}

		// Expect the sequence to be the event afterwards
		request, _ = http.NewRequest(http.MethodPost, "/collect", body)
		request.Header.Add("ce-specversion", "0.3")
		request.Header.Add("ce-type", "https://acme.com/PersonCreated")
		request.Header.Add("ce-time", "2018-04-05T03:56:24Z")
		request.Header.Add("ce-id", uuid.New().String())
		request.Header.Add("ce-source", "birdie.care")
		request.Header.Add("fossil-stream", "person/1234")
		request.Header.Add("fossil-expected-sequence-number", strconv.Itoa(sequenceNumber+1))
		request.Header.Add("Content-Type", "application/json; charset=utf-8")

		response = httptest.NewRecorder()
		server.ServeHTTP(response, request)
		ExpectResponseCode(t, response, 200)
	})

	t.Run("it collects the fact that the producer is waiting for some consumer", func(t *testing.T) {
		body := strings.NewReader("{\"mood\": \"happy\"}")
		eventId := uuid.New().String()

		request, _ := http.NewRequest(http.MethodPost, "/collect", body)
		request.Header.Add("ce-specversion", "0.3")
		request.Header.Add("ce-type", "https://acme.com/PersonCreated")
		request.Header.Add("ce-time", "2018-04-05T03:56:24Z")
		request.Header.Add("ce-id", eventId)
		request.Header.Add("ce-source", "birdie.care")
		request.Header.Add("fossil-stream", "person/1234")
		request.Header.Add("fossil-wait-consumer", "<foo>")
		request.Header.Add("Content-Type", "application/json; charset=utf-8")

		server.ServeHTTP(httptest.NewRecorder(), request)

		storedEvent, err := storage.Find(context.Background(), eventId)
		if err != nil {
			t.Error(err)
		}

		consumers := events.GetConsumersWaitedForAcknowledgmentFromEvent(*storedEvent)
		if len(consumers) != 1 && consumers[0] != "foo" {
			t.Errorf("expected to find one consumer named '%s', found %s instead", "foo", consumers)
		}
	})
}
