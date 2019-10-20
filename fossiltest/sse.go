package fossiltest

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"strings"
	"testing"
	"time"
)

// ServerSideEvent represents a Server-Sent ServerSideEvent
type ServerSideEvent struct {
	Name string
	ID   string
	Data map[string]interface{}
}

func hasPrefix(s []byte, prefix string) bool {
	return bytes.HasPrefix(s, []byte(prefix))
}

func ReadServerSideEvents(reader *bufio.Reader, events chan ServerSideEvent) {
	ev := ServerSideEvent{}

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
					ev = ServerSideEvent{}
				}
			}

		default:
			fmt.Fprintf(os.Stderr, "Error: len:%d\n%s", len(line), line)

			close(events)
		}
	}
}

func ExpectServerSideEventWithId(t *testing.T, event ServerSideEvent, id string) {
	if event.ID != id {
		t.Errorf("expected SSE event to have id %s but got %s", id, event.ID)
	}
}
