package http

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"github.com/sroze/fossil"
	"github.com/sroze/fossil/fossiltest"
	in_memory "github.com/sroze/fossil/in-memory"
	"github.com/sroze/fossil/streaming"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"strings"
	"testing"
	"time"
)

// Event represents a Server-Sent Event
type Event struct {
	Name string
	ID   string
	Data map[string]interface{}
}

func hasPrefix(s []byte, prefix string) bool {
	return bytes.HasPrefix(s, []byte(prefix))
}

func ReadServerSideEvents(reader *bufio.Reader, events chan Event) {
	ev := Event{}

	var buf bytes.Buffer

	for {
		line, err := reader.ReadBytes('\n')
		if err == io.EOF {
			// TODO: Use timeout as well.
			time.Sleep(10 * time.Millisecond)
			continue
		}

		if err != nil {
			fmt.Fprintf(os.Stderr, "error during resp.Body read:%s\n", err)

			close(events)
		}

		switch {
		case hasPrefix(line, ":"):
			// Comment, do nothing
		case hasPrefix(line, "retry:"):
			// Retry, do nothing for now

		// id of event
		case hasPrefix(line, "id: "):
			ev.ID = strings.TrimSpace(string(line[4:]))
		case hasPrefix(line, "id:"):
			ev.ID = strings.TrimSpace(string(line[3:]))

		// name of event
		case hasPrefix(line, "event: "):
			ev.Name = string(line[7 : len(line)-1])
		case hasPrefix(line, "event:"):
			ev.Name = string(line[6 : len(line)-1])

		// event data
		case hasPrefix(line, "data: "):
			buf.Write(line[6:])
		case hasPrefix(line, "data:"):
			buf.Write(line[5:])

		// end of event
		case bytes.Equal(line, []byte("\n")):
			b := buf.Bytes()

			if hasPrefix(b, "{") {
				var data map[string]interface{}

				err := json.Unmarshal(b, &data)

				if err == nil {
					ev.Data = data
					buf.Reset()
					events <- ev
					ev = Event{}
				}
			}

		default:
			fmt.Fprintf(os.Stderr, "Error: len:%d\n%s", len(line), line)

			close(events)
		}
	}
}

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

		events := make(chan Event)
		reader := bufio.NewReader(response.Body)
		go ReadServerSideEvents(reader, events)

		// Event is consumed
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
