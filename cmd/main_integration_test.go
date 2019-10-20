// +build integration

package main

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"github.com/google/uuid"
	"github.com/sroze/fossil/fossiltest"
	"net/http"
	"net/url"
	"testing"
	"os"
	"time"
)

func CollectEvent(t *testing.T, id string, stream string, contents interface{}) {
	requestUrl := fmt.Sprintf("http://localhost:%s/collect", os.Getenv("SERVER_PORT"))
	requestBody, err := json.Marshal(contents)

	if err != nil {
		t.Error(err)
	}

	request, err := http.NewRequest("POST", requestUrl, bytes.NewBuffer(requestBody))
	if err != nil {
		t.Error(err)
	}

	request.Header.Set("content-type", "application/json")
	request.Header.Set("ce-id", id)
	request.Header.Set("ce-specversion", "0.3")
	request.Header.Set("ce-type", "my-type")
	request.Header.Set("ce-time", "2018-04-05T03:56:24Z")
	request.Header.Set("ce-source", "birdie.care")
	request.Header.Set("fossil-stream", stream)

	response, err := http.DefaultClient.Do(request)
	if err != nil {
		t.Error(err)
		return
	}

	if response.StatusCode != 200 {
		t.Errorf("expected status 200 but got %d", response.StatusCode)
	}
}

func TestWithDatabase(t *testing.T) {
	go func() {
		err := StartServer()

		if err != nil {
			t.Error(err)
		}
	}()

	time.Sleep(1 * time.Second)

	t.Run("publish, listen and publish", func(t *testing.T) {
		prefix := uuid.New().String()

		// Collect an event
		firstId := uuid.New().String()
		CollectEvent(t, firstId, fmt.Sprintf("/%s/123", prefix), map[string]string{
			"mood": "happy",
		})

		// Streams the streamedEvents from the `visits/*` streams
		streamedEvents := make(chan fossiltest.ServerSideEvent)
		go func() {
			query := url.Values{}
			query.Set("matcher", fmt.Sprintf("/%s/*", prefix))

			requestUrl := fmt.Sprintf("http://localhost:%s/stream?%s", os.Getenv("SERVER_PORT"), query.Encode())
			request, err := http.NewRequest("GET", requestUrl, nil)
			if err != nil {
				t.Error(err)
			}

			request.Header.Set("Accept", "text/event-stream")

			response, err := http.DefaultClient.Do(request)
			if err != nil {
				t.Error(err)
			}

			// defer request.Body.Close()

			fossiltest.ReadServerSideEvents(bufio.NewReader(response.Body), streamedEvents)
		}()

		// Collect another event
		secondId := uuid.New().String()
		CollectEvent(t, secondId, fmt.Sprintf("/%s/987", prefix), map[string]string{
			"mood": "okay",
		})

		// Expect streamedEvents to be two
		fossiltest.ExpectServerSideEventWithId(t, <- streamedEvents, firstId)
		fossiltest.ExpectServerSideEventWithId(t, <- streamedEvents, secondId)
	})
}
