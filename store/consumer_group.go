package store

import (
	"encoding/json"
	"fmt"
	cloudevents "github.com/cloudevents/sdk-go"
	"github.com/go-chi/chi"
	"github.com/google/uuid"
	"github.com/sroze/fossil/events"
	"net/http"
)

var consumerGroupNamespace = uuid.MustParse("69bf702a-9525-4a41-9c95-a8ae37a1360d")
var consumerGroupEventType = "fossil.consumer_acknowledgement"

func acknowledgmentStreamFromConsumerName(consumerName string) string {
	return fmt.Sprintf("fossil/consumer/%s/acknowledgments", consumerName)
}

func getLastEvent(channel chan cloudevents.Event) *cloudevents.Event {
	var lastEvent *cloudevents.Event
	for event := range channel {
		lastEvent = &event
	}

	return lastEvent
}

type ConsumerGroup struct {
	sseRouter *SSERouter
	store     EventStore
	loader    EventLoader
	lock      DistributedLock
}

func NewConsumerGroup(sseRouter *SSERouter, store EventStore, loader EventLoader, lock DistributedLock) *ConsumerGroup {
	return &ConsumerGroup{
		sseRouter,
		store,
		loader,
		lock,
	}
}

func (cg *ConsumerGroup) Mount(router *chi.Mux) {
	router.Get("/consumer/{name}/stream", cg.Stream)
	router.Put("/consumer/{name}/ack", cg.Ack)
}

func (cg *ConsumerGroup) Stream(rw http.ResponseWriter, req *http.Request) {
	consumerName := chi.URLParam(req, "name")
	err := cg.lock.Lock(req.Context(), consumerName)
	if err != nil {
		http.Error(rw, "Could not acquire lock for named consumer", http.StatusInternalServerError)
		return
	}

	// Release lock when streaming is finished
	defer cg.lock.Release(consumerName)

	acknowledgment := getLastEvent(
		cg.loader.MatchingStream(req.Context(), events.Matcher{
			UriTemplate: acknowledgmentStreamFromConsumerName(consumerName),
		}),
	)

	if acknowledgment != nil {
		dataAsBytes, ok := acknowledgment.Data.([]byte)
		if !ok {
			http.Error(rw, "Could not read last acknowledgment", http.StatusInternalServerError)
			return
		}

		var lastEventId string
		err := json.Unmarshal(dataAsBytes, &lastEventId)
		if err != nil {
			http.Error(rw, "Could not decode last acknowledgment", http.StatusInternalServerError)
			return
		}

		req.Header.Set("Last-Event-Id", lastEventId)
	}

	cg.sseRouter.StreamEvents(rw, req)
}

func (cg *ConsumerGroup) Ack(rw http.ResponseWriter, req *http.Request) {
	consumerName := chi.URLParam(req, "name")
	lastEventId := req.Header.Get("Last-Event-Id")
	if lastEventId == "" {
		http.Error(rw, "Missing 'Last-Event-Id' header.", http.StatusBadRequest)
		return
	}

	event := cloudevents.NewEvent("0.3")
	event.SetID(uuid.NewMD5(consumerGroupNamespace, []byte(consumerName)).String())
	event.SetSource("fossil")
	event.SetType(consumerGroupEventType)
	err := event.SetData(lastEventId)
	if err != nil {
		http.Error(rw, err.Error(), http.StatusInternalServerError)
		return
	}

	events.SetEventToReplaceExistingOne(&event)

	err = cg.store.Store(req.Context(), acknowledgmentStreamFromConsumerName(consumerName), &event)
	if err != nil {
		http.Error(rw, err.Error(), http.StatusInternalServerError)
		return
	}

	rw.WriteHeader(http.StatusOK)
}
