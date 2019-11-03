// +build integration

package server

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"errors"
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
	response := CollectEventWithHeaders(t, id, stream, contents, map[string]string{})

	if response.StatusCode != 200 {
		t.Errorf("expected status 200 but got %d", response.StatusCode)
	}

	return response
}

func CollectEventWithHeaders(t *testing.T, id string, stream string, contents interface{}, headers map[string]string) *http.Response {
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

	for key, value := range headers {
		request.Header.Set(key, value)
	}

	response, err := http.DefaultClient.Do(request)
	if err != nil {
		t.Error(err)
	}

	return response
}

func StreamEventsFromUrl(ctx context.Context, url string, channel chan fossiltesting.ServerSentEvent) {
	StreamEventsFromUrlWithHeaders(ctx, url, channel, map[string]string{})
}

func StreamEventsFromUrlWithHeaders(ctx context.Context, url string, channel chan fossiltesting.ServerSentEvent, headers map[string]string) {
	request, err := http.NewRequest("GET", url, nil)
	if err != nil {
		panic(err)
	}

	request.Header.Set("Accept", "text/event-stream")
	for key, value := range headers {
		request.Header.Set(key, value)
	}

	response, err := http.DefaultClient.Do(request.WithContext(ctx))
	if err != nil {
		if errors.Is(err, context.Canceled) {
			return
		}

		panic(err)
	}

	fossiltesting.ReadServerSideEvents(bufio.NewReader(response.Body), channel)
}

func StreamEvents(matcher string, channel chan fossiltesting.ServerSentEvent) {
	StreamEventsWithHeaders(matcher, channel, map[string]string{})
}

func StreamEventsWithHeaders(matcher string, channel chan fossiltesting.ServerSentEvent, headers map[string]string) {
	query := url.Values{}
	query.Set("matcher", matcher)
	requestUrl := fmt.Sprintf("http://localhost:%s/stream?%s", os.Getenv("SERVER_PORT"), query.Encode())

	StreamEventsFromUrlWithHeaders(context.Background(), requestUrl, channel, headers)
}

func StreamAndCommit(ctx context.Context, consumerName string, matcher string, channel chan fossiltesting.ServerSentEvent) error {
	query := url.Values{}
	query.Set("matcher", matcher)
	requestUrl := fmt.Sprintf("http://localhost:%s/consumer/%s/stream?%s", os.Getenv("SERVER_PORT"), consumerName, query.Encode())

	events := make(chan fossiltesting.ServerSentEvent)
	go StreamEventsFromUrl(ctx, requestUrl, events)

	for sse := range events {
		eventNumber, ok := sse.Data["fossileventnumber"].(float64)
		if !ok {
			return fmt.Errorf("could not get event number from SSE: %s", sse.Data)
		}

		err := CommitConsumerOffset(consumerName, strconv.Itoa(int(eventNumber)))
		if err != nil {
			return err
		}

		channel <- sse
	}

	return nil
}

func CommitConsumerOffset(consumerName string, eventNumber string) error {
	requestUrl := fmt.Sprintf("http://localhost:%s/consumer/%s/commit", os.Getenv("SERVER_PORT"), consumerName)
	request, err := http.NewRequest("PUT", requestUrl, nil)
	if err != nil {
		return err
	}

	request.Header.Set("Last-Fossil-Event-Number", eventNumber)
	response, err := http.DefaultClient.Do(request)
	if err != nil {
		return err
	}

	if response.StatusCode != 200 {
		return fmt.Errorf("expected status 200, got %d", response.StatusCode)
	}

	return nil
}

func AcknowledgeEvent(consumerName string, event fossiltesting.ServerSentEvent) error {
	contents := map[string]string{
		"consumer_name": consumerName,
	}
	requestBody, err := json.Marshal(contents)
	if err != nil {
		return err
	}

	requestUrl := fmt.Sprintf("http://localhost:%s/events/%s/ack", os.Getenv("SERVER_PORT"), event.ID)
	request, err := http.NewRequest("POST", requestUrl, bytes.NewBuffer(requestBody))
	if err != nil {
		return err
	}

	response, err := http.DefaultClient.Do(request)
	if err != nil {
		return err
	}

	if response.StatusCode != 200 {
		return fmt.Errorf("expected status 200 but got %d", response.StatusCode)
	}

	return nil
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
		go StreamEvents(fmt.Sprintf("/%s/*", prefix), streamedEvents)

		// Collect another event
		secondId := uuid.New().String()
		CollectEvent(t, secondId, fmt.Sprintf("/%s/987", prefix), map[string]string{
			"mood": "okay",
		})

		// Expect streamedEvents to be two
		fossiltesting.ExpectServerSideEventWithId(t, <-streamedEvents, firstId)
		fossiltesting.ExpectServerSideEventWithId(t, <-streamedEvents, secondId)
	})

	t.Run("get events up to a certain point only, with the SSE last event ID", func(t *testing.T) {
		prefix := uuid.New().String()

		// Collect multiple events
		CollectEvent(t, uuid.New().String(), fmt.Sprintf("/%s/123", prefix), map[string]string{
			"mood": "happy",
		})
		CollectEvent(t, uuid.New().String(), fmt.Sprintf("/%s/123", prefix), map[string]string{
			"mood": "happy",
		})
		lastEventId := uuid.New().String()
		CollectEvent(t, lastEventId, fmt.Sprintf("/%s/123", prefix), map[string]string{
			"mood": "happy",
		})

		afterLastId := uuid.New().String()
		CollectEvent(t, afterLastId, fmt.Sprintf("/%s/123", prefix), map[string]string{
			"mood": "happy",
		})

		// Streams the streamedEvents from the `visits/*` streams
		streamedEvents := make(chan fossiltesting.ServerSentEvent)
		go StreamEventsWithHeaders(fmt.Sprintf("/%s/*", prefix), streamedEvents, map[string]string{
			"Last-Event-Id": lastEventId,
		})

		// Expect to receive the one after last
		fossiltesting.ExpectServerSideEventWithId(t, <-streamedEvents, afterLastId)
	})

	t.Run("get events up to a certain point only, with the last fossil event number", func(t *testing.T) {
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

		afterLastId := uuid.New().String()
		CollectEvent(t, afterLastId, fmt.Sprintf("/%s/123", prefix), map[string]string{
			"mood": "happy",
		})

		// Streams the streamedEvents from the `visits/*` streams
		streamedEvents := make(chan fossiltesting.ServerSentEvent)
		go StreamEventsWithHeaders(fmt.Sprintf("/%s/*", prefix), streamedEvents, map[string]string{
			"Last-Fossil-Event-Number": lastResponse.Header.Get("fossil-event-number"),
		})

		// Expect to receive the one after last
		fossiltesting.ExpectServerSideEventWithId(t, <-streamedEvents, afterLastId)
	})

	t.Run("consume, commit and re-consume", func(t *testing.T) {
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

		// CommitOffset the 1st one
		consumerName := "testing-" + uuid.New().String()
		err := CommitConsumerOffset(consumerName, firstResponseEventNumber)
		if err != nil {
			t.Error(err)
			return
		}

		// Listen to events, we should only have the 2nd one
		streamedEvents := make(chan fossiltesting.ServerSentEvent)
		query := url.Values{}
		query.Set("matcher", fmt.Sprintf("/%s/*", prefix))
		requestUrl := fmt.Sprintf("http://localhost:%s/consumer/%s/stream?%s", os.Getenv("SERVER_PORT"), consumerName, query.Encode())

		go StreamEventsFromUrl(context.Background(), requestUrl, streamedEvents)

		// Expect to receive the one after last
		fossiltesting.ExpectServerSideEventWithId(t, <-streamedEvents, secondEventId)
	})

	t.Run("events don't get duplicated on multiple named consumers connections", func(t *testing.T) {
		allEvents := make(chan fossiltesting.ServerSentEvent)

		consumerName := "testing-" + uuid.New().String()
		prefix := uuid.New().String()
		matcher := fmt.Sprintf("/%s/*", prefix)

		// Start two listeners
		firstContext, cancelFirst := context.WithCancel(context.Background())

		go func() {
			err := StreamAndCommit(firstContext, consumerName, matcher, allEvents)
			if err != nil {
				fmt.Println("medre", err)
				t.Error(err)
			}
		}()
		time.Sleep(50 * time.Millisecond)
		go func() {
			err := StreamAndCommit(context.Background(), consumerName, matcher, allEvents)
			if err != nil {
				fmt.Println("medre", err)
				t.Error(err)
			}
		}()

		// Collect an event
		firstEventId := uuid.New().String()
		CollectEvent(t, firstEventId, fmt.Sprintf("/%s/123", prefix), map[string]string{
			"mood": "sad",
		})

		// Kill the 1st listener
		time.Sleep(100 * time.Millisecond)
		cancelFirst()
		time.Sleep(100 * time.Millisecond)

		// Collect an event
		secondEventId := uuid.New().String()
		CollectEvent(t, secondEventId, fmt.Sprintf("/%s/123", prefix), map[string]string{
			"mood": "happy",
		})

		// Expect only 2 events to have been received
		fossiltesting.ExpectServerSideEventWithId(t, <-allEvents, firstEventId)
		fossiltesting.ExpectServerSideEventWithId(t, <-allEvents, secondEventId)
	})

	t.Run("times out if message is not acknowledged", func(t *testing.T) {
		consumerName := uuid.New().String()
		prefix := uuid.New().String()

		collectResponse := CollectEventWithHeaders(t, uuid.New().String(), fmt.Sprintf("/%s/123", prefix), map[string]string{
			"mood": "happy",
		}, map[string]string{
			"Fossil-Wait-Consumer": fmt.Sprintf("<%s>; timeout=50", consumerName),
		})

		if collectResponse.StatusCode != 202 {
			t.Errorf("expected status 202 but got %d", collectResponse.StatusCode)
		}
	})

	t.Run("wait for message acknowledgment", func(t *testing.T) {
		consumerName := uuid.New().String()
		prefix := uuid.New().String()

		var collectResponse *http.Response
		requestHasStarted := make(chan bool, 1)

		go func() {
			requestHasStarted <- true

			collectResponse = CollectEventWithHeaders(t, uuid.New().String(), fmt.Sprintf("/%s/123", prefix), map[string]string{
				"mood": "happy",
			}, map[string]string{
				"Fossil-Wait-Consumer": fmt.Sprintf("<%s>; timeout=200", consumerName),
			})

			if collectResponse.StatusCode > 300 {
				fmt.Println("Collect error", collectResponse)
				t.Errorf("Collect returned response code %d", collectResponse.StatusCode)
			}
		}()

		<-requestHasStarted

		streamedEvents := make(chan fossiltesting.ServerSentEvent)
		go StreamEvents(fmt.Sprintf("/%s/*", prefix), streamedEvents)
		event := <-streamedEvents

		// Do acknowledge
		err := AcknowledgeEvent(consumerName, event)
		if err != nil {
			t.Error(err)
			return
		}

		time.Sleep(50 * time.Millisecond)

		if collectResponse == nil {
			t.Error("Request was not finished.")
		}
	})
}
