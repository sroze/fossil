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
	"strconv"
	"testing"
	"os"
	"time"
)

func CollectEvent(t *testing.T, id string, stream string, contents interface{}) *http.Response {
	requestUrl := fmt.Sprintf("http://localhost:%s/collect", os.Getenv("SERVER_PORT"))
	requestBody, err := json.Marshal(contents)

	if err != nil {
		t.Error(err)
		return nil
	}

	request, err := http.NewRequest("POST", requestUrl, bytes.NewBuffer(requestBody))
	if err != nil {
		t.Error(err)
		return nil
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
		return response
	}

	if response.StatusCode != 200 {
		t.Errorf("expected status 200 but got %d", response.StatusCode)
	}

	return response
}

func StreamEvents(matcher string, lastEventId int, channel chan fossiltest.ServerSentEvent) {
	query := url.Values{}
	query.Set("matcher", matcher)

	requestUrl := fmt.Sprintf("http://localhost:%s/stream?%s", os.Getenv("SERVER_PORT"), query.Encode())
	request, err := http.NewRequest("GET", requestUrl, nil)
	if err != nil {
		panic(err)
	}

	request.Header.Set("Accept", "text/event-stream")
	if lastEventId > 0 {
		request.Header.Set("Last-Event-Id", strconv.Itoa(lastEventId))
	}

	response, err := http.DefaultClient.Do(request)
	if err != nil {
		panic(err)
	}

	fossiltest.ReadServerSideEvents(bufio.NewReader(response.Body), channel)
}

func TestWithDatabase(t *testing.T) {
	go func() {
		err := StartServer()

		if err != nil {
			t.Error(err)
		}
	}()

	time.Sleep(1 * time.Second)

	t.Run("returns existing events and stream new ones", func(t *testing.T) {
		prefix := uuid.New().String()

		// Collect an event
		firstId := uuid.New().String()
		CollectEvent(t, firstId, fmt.Sprintf("/%s/123", prefix), map[string]string{
			"mood": "happy",
		})

		// Streams the streamedEvents from the `visits/*` streams
		streamedEvents := make(chan fossiltest.ServerSentEvent)
		go StreamEvents(fmt.Sprintf("/%s/*", prefix), 0, streamedEvents)

		// Collect another event
		secondId := uuid.New().String()
		CollectEvent(t, secondId, fmt.Sprintf("/%s/987", prefix), map[string]string{
			"mood": "okay",
		})

		// Expect streamedEvents to be two
		fossiltest.ExpectServerSideEventWithId(t, <- streamedEvents, firstId)
		fossiltest.ExpectServerSideEventWithId(t, <- streamedEvents, secondId)
	})

	t.Run("get events up to a certain point only", func(t *testing.T) {
		prefix := uuid.New().String()

		// Collect multiple events
		CollectEvent(t, uuid.New().String(), fmt.Sprintf("/%s/123", prefix), map[string]string{
			"mood": "happy",
		})
		CollectEvent(t, uuid.New().String(), fmt.Sprintf("/%s/123", prefix), map[string]string{
			"mood": "happy",
		})
		lastResponse := CollectEvent(t, uuid.New().String(), fmt.Sprintf("/%s/123", prefix), map[string]string{
			"mood": "happy",
		})
		lastResponseEventNumber, err := strconv.Atoi(lastResponse.Header.Get("fossil-event-number"))
		if err != nil {
			t.Error(err)
			return
		}

		afterLastId := uuid.New().String()
		CollectEvent(t, afterLastId, fmt.Sprintf("/%s/123", prefix), map[string]string{
			"mood": "happy",
		})

		// Streams the streamedEvents from the `visits/*` streams
		streamedEvents := make(chan fossiltest.ServerSentEvent)
		go StreamEvents(fmt.Sprintf("/%s/*", prefix), lastResponseEventNumber, streamedEvents)

		// Expect to receive the one after last
		fossiltest.ExpectServerSideEventWithId(t, <- streamedEvents, afterLastId)
	})
}
