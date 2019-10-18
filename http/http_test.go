package http

import (
	"github.com/sroze/fossil"
	"github.com/sroze/fossil/in-memory"
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
	server := NewFossilServer(
		fossil.NewCollector(
			in_memory.NewInMemoryStorage(),
			in_memory.NewInMemoryPublisher(),
		),
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
		request.Header.Add("Content-Type", "application/json; charset=utf-8")

		response := httptest.NewRecorder()

		server.ServeHTTP(response, request)

		ExpectResponseCode(t, response, 200)
	})
}
