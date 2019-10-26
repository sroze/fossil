package store

import (
	"context"
	"encoding/json"
	"fmt"
	cloudevents "github.com/cloudevents/sdk-go"
	"github.com/go-chi/chi"
	"github.com/google/uuid"
	"github.com/sroze/fossil/concurrency"
	"github.com/sroze/fossil/events"
	"io/ioutil"
	"net/http"
	"time"
)

var messageAcknowledgmentStream = "fossil/message-acknowledgments"
var messageAcknowledgmentEventType = "fossil.message-acknowledgments"

type WaitConsumerConfiguration struct {
	EventId      string
	ConsumerName string
	Timeout      time.Duration
}

type EventAcknowledgment struct {
	EventId      string `json:"event_id"`
	ConsumerName string `json:"consumer_name"`
}

type ConsumerWaiter struct {
	broadcaster *concurrency.ChannelBroadcaster
}

func NewConsumerWaiter(broadcaster *concurrency.ChannelBroadcaster) *ConsumerWaiter {
	return &ConsumerWaiter{
		broadcaster,
	}
}

type ConsumerWaiterRouter struct {
	collector Collector
}

func NewConsumerWaiterRouter(collector Collector) *ConsumerWaiterRouter {
	return &ConsumerWaiterRouter{
		collector,
	}
}
func (cwr *ConsumerWaiterRouter) Mount(router *chi.Mux) {
	router.Post("/events/{id}/ack", cwr.Ack)
}

func (cwr *ConsumerWaiterRouter) Ack(rw http.ResponseWriter, req *http.Request) {
	eventId := chi.URLParam(req, "id")
	body, err := ioutil.ReadAll(req.Body)
	if err != nil {
		fmt.Printf("failed to handle request: %s", err)
		rw.WriteHeader(http.StatusBadRequest)
		_, _ = rw.Write([]byte(`{"error":"Invalid request"}`))
		return
	}

	ack := EventAcknowledgment{}
	err = json.Unmarshal(body, &ack)
	if err != nil {
		fmt.Printf("failed to decode message request: %s", err)
		rw.WriteHeader(http.StatusBadRequest)
		_, _ = rw.Write([]byte(`{"error":"Invalid request"}`))
		return
	}

	// Ensure you ack on the right event
	ack.EventId = eventId

	event := &cloudevents.Event{}
	event.SetSpecVersion("0.3")
	event.SetSource("fossil")
	event.SetID(uuid.New().String())
	event.SetType(messageAcknowledgmentEventType)
	events.SetStream(event, messageAcknowledgmentStream)

	err = event.SetData(ack)
	if err != nil {
		http.Error(rw, "Could not set data", http.StatusInternalServerError)
		return
	}

	err = cwr.collector.Collect(req.Context(), event)
	if err != nil {
		http.Error(rw, "Could collect acknowledgement", http.StatusInternalServerError)
		return
	}

	rw.WriteHeader(http.StatusOK)
	_, _ = rw.Write([]byte(`{}`))
}

func (w *ConsumerWaiter) getEventAcknowledgment(ctx context.Context, configuration WaitConsumerConfiguration) chan error {
	subscription := w.broadcaster.NewSubscriber()
	channel := make(chan error, 1)

	go func() {
		<-ctx.Done()

		w.broadcaster.RemoveSubscriber(subscription)
	}()

	go func() {
		defer w.broadcaster.RemoveSubscriber(subscription)

		for event := range subscription {
			if events.GetStreamFromEvent(event) != messageAcknowledgmentStream {
				continue
			}

			dataAsBytes, err := event.DataBytes()
			if err != nil {
				channel <- err
				break
			}

			var ack EventAcknowledgment
			err = json.Unmarshal(dataAsBytes, &ack)
			if err != nil {
				channel <- err
				break
			}

			if ack.EventId == configuration.EventId && ack.ConsumerName == configuration.ConsumerName {
				channel <- nil
				break
			}
		}

		close(channel)
	}()

	return channel
}

func (w *ConsumerWaiter) WaitFor(ctx context.Context, configurations []WaitConsumerConfiguration) chan error {
	channel := make(chan error, 1)
	configurationsChannel := make(chan error, len(configurations))

	for _, configuration := range configurations {
		go func() {
			subContext, cancel := context.WithCancel(ctx)

			select {
			case res := <-w.getEventAcknowledgment(subContext, configuration):
				configurationsChannel <- res
			case <-time.After(configuration.Timeout):
				configurationsChannel <- &ConsumerTimedOut{
					configuration,
				}
			}

			cancel()
		}()
	}

	go func() {
		for range configurations {
			err := <-configurationsChannel

			if err != nil {
				channel <- err

				return
			}
		}

		channel <- nil
	}()

	return channel
}
