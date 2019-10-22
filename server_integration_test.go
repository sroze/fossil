// +build integration

package fossil

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"github.com/google/uuid"
	fossiltesting "github.com/sroze/fossil/testing"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"testing"
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

func StreamEventsFromUrl(url string, lastEventId int, channel chan fossiltesting.ServerSentEvent) {
	request, err := http.NewRequest("GET", url, nil)
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

	fossiltesting.ReadServerSideEvents(bufio.NewReader(response.Body), channel)
}

func StreamEvents(matcher string, lastEventId int, channel chan fossiltesting.ServerSentEvent) {
	query := url.Values{}
	query.Set("matcher", matcher)
	requestUrl := fmt.Sprintf("http://localhost:%s/stream?%s", os.Getenv("SERVER_PORT"), query.Encode())

	StreamEventsFromUrl(requestUrl, lastEventId, channel)
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
		streamedEvents := make(chan fossiltesting.ServerSentEvent)
		go StreamEvents(fmt.Sprintf("/%s/*", prefix), 0, streamedEvents)

		// Collect another event
		secondId := uuid.New().String()
		CollectEvent(t, secondId, fmt.Sprintf("/%s/987", prefix), map[string]string{
			"mood": "okay",
		})

		// Expect streamedEvents to be two
		fossiltesting.ExpectServerSideEventWithId(t, <-streamedEvents, firstId)
		fossiltesting.ExpectServerSideEventWithId(t, <-streamedEvents, secondId)
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
		streamedEvents := make(chan fossiltesting.ServerSentEvent)
		go StreamEvents(fmt.Sprintf("/%s/*", prefix), lastResponseEventNumber, streamedEvents)

		// Expect to receive the one after last
		fossiltesting.ExpectServerSideEventWithId(t, <-streamedEvents, afterLastId)
	})

	t.Run("consume, ack and re-consume", func(t *testing.T) {
		prefix := uuid.New().String()

		// Collect two events
		firstResponse := CollectEvent(t, uuid.New().String(), fmt.Sprintf("/%s/123", prefix), map[string]string{
			"mood": "okay",
		})
		firstResponseEventNumber := firstResponse.Header.Get("fossil-event-number")
		if firstResponseEventNumber == "" {
			t.Error("last event id is empty")
			return
		}

		secondEventId := uuid.New().String()
		CollectEvent(t, secondEventId, fmt.Sprintf("/%s/123", prefix), map[string]string{
			"mood": "happy",
		})

		// Ack the 1st one
		consumerName := "testing-" + uuid.New().String()
		requestUrl := fmt.Sprintf("http://localhost:%s/consumer/%s/ack", os.Getenv("SERVER_PORT"), consumerName)
		request, err := http.NewRequest("PUT", requestUrl, nil)
		if err != nil {
			t.Error(err)
			return
		}

		request.Header.Set("Last-Event-Id", firstResponseEventNumber)
		response, err := http.DefaultClient.Do(request)
		if err != nil {
			t.Error(err)
			return
		}

		if response.StatusCode != 200 {
			t.Errorf("expected status 200, got %d", response.StatusCode)
			return
		}

		// Listen to events, we should only have the 2nd one
		streamedEvents := make(chan fossiltesting.ServerSentEvent)
		query := url.Values{}
		query.Set("matcher", fmt.Sprintf("/%s/*", prefix))
		requestUrl = fmt.Sprintf("http://localhost:%s/consumer/%s/stream?%s", os.Getenv("SERVER_PORT"), consumerName, query.Encode())

		go StreamEventsFromUrl(requestUrl, 0, streamedEvents)

		// Expect to receive the one after last
		fossiltesting.ExpectServerSideEventWithId(t, <-streamedEvents, secondEventId)
	})
}
