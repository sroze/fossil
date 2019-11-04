package store

import (
	"context"
	"fmt"
	"github.com/google/uuid"
	"github.com/sroze/fossil/concurrency"
	"github.com/sroze/fossil/events"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestNamedConsumers(t *testing.T) {

	storage := NewInMemoryStorage()
	collector := NewCollector(
		storage,
		NewInMemoryPublisher(),
	)

	server := NewFossilServer(
		collector,
		NewEventStreamFactory(storage),
		storage,
		storage,
		concurrency.NewInMemoryLock(),
		"",
	)

	t.Run("Commits with the last known event number", func(t *testing.T) {
		t.Run("with a valid event number", func(t *testing.T) {
			consumerName := uuid.New().String()

			request, _ := http.NewRequest(http.MethodPut, fmt.Sprintf("/consumer/%s/commit", consumerName), nil)
			request.Header.Set("Last-Fossil-Event-Number", "12345")
			response := httptest.NewRecorder()

			server.ServeHTTP(response, request)

			ExpectResponseCode(t, response, 200)

			if storage.countEventsInStream(fmt.Sprintf("fossil/consumer/%s/commit-offsets", consumerName)) != 1 {
				t.Error("Expect one event but found none.")
			}
		})

		t.Run("needs to be an integer", func(t *testing.T) {
			consumerName := "testing"

			request, _ := http.NewRequest(http.MethodPut, "/consumer/"+consumerName+"/commit", nil)
			request.Header.Set("Last-Fossil-Event-Number", uuid.New().String())
			response := httptest.NewRecorder()

			server.ServeHTTP(response, request)

			ExpectResponseCode(t, response, 400)
		})
	})

	t.Run("Commits with the last known event identifier", func(t *testing.T) {
		t.Run("returns an error if the event does not exist", func(t *testing.T) {
			consumerName := "testing"

			request, _ := http.NewRequest(http.MethodPut, "/consumer/"+consumerName+"/commit", nil)
			request.Header.Set("Last-Event-Id", uuid.New().String())
			response := httptest.NewRecorder()

			server.ServeHTTP(response, request)

			ExpectResponseCode(t, response, 404)
		})

		t.Run("uses the event's number to commit", func(t *testing.T) {
			consumerName := uuid.New().String()
			event := events.NewEvent(
				uuid.New().String(),
				"some/stream",
				12,
				1,
			)

			err := storage.Store(context.Background(), "some/stream", &event)
			if err != nil {
				t.Error(err)
				return
			}

			request, _ := http.NewRequest(http.MethodPut, fmt.Sprintf("/consumer/%s/commit", consumerName), nil)
			request.Header.Set("Last-Event-Id", event.ID())
			response := httptest.NewRecorder()

			server.ServeHTTP(response, request)

			ExpectResponseCode(t, response, 200)

			committedEvent := <-storage.MatchingStream(context.Background(), events.Matcher{
				UriTemplates: []string{fmt.Sprintf("fossil/consumer/%s/commit-offsets", consumerName)},
			})

			offset, err := getCommittedOffsetFromEvent(&committedEvent)
			if err != nil {
				t.Error(err)
			} else if offset != events.GetEventNumber(event) {
				t.Errorf("Expected event numbered %d but got %d", events.GetEventNumber(event), offset)
			}
		})
	})
}
