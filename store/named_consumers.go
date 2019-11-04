package store

import (
	"encoding/json"
	"errors"
	"fmt"
	cloudevents "github.com/cloudevents/sdk-go"
	"github.com/go-chi/chi"
	"github.com/google/uuid"
	"github.com/sroze/fossil/events"
	"net/http"
	"strconv"
)

var consumerGroupNamespace = uuid.MustParse("69bf702a-9525-4a41-9c95-a8ae37a1360d")
var consumerGroupEventType = "fossil.consumer_offset"

func commitOffsetStreamFromConsumerName(consumerName string) string {
	return fmt.Sprintf("fossil/consumer/%s/commit-offsets", consumerName)
}

func getLastEvent(channel chan cloudevents.Event) *cloudevents.Event {
	var lastEvent *cloudevents.Event
	for event := range channel {
		lastEvent = &event
	}

	return lastEvent
}

type NamedConsumers struct {
	sseRouter *SSERouter
	store     EventStore
	loader    EventLoader
	lock      DistributedLock
}

func NewNamedConsumers(sseRouter *SSERouter, store EventStore, loader EventLoader, lock DistributedLock) *NamedConsumers {
	return &NamedConsumers{
		sseRouter,
		store,
		loader,
		lock,
	}
}

func (cg *NamedConsumers) Mount(router *chi.Mux) {
	router.Get("/consumer/{name}/sse", cg.Stream)
	router.Put("/consumer/{name}/commit", cg.CommitOffset)
}

func getCommittedOffsetFromEvent(event *cloudevents.Event) (int, error) {
	dataAsBytes, ok := event.Data.([]byte)
	if !ok {
		return 0, errors.New("could not read last offset")
	}

	var lastEventNumber int
	err := json.Unmarshal(dataAsBytes, &lastEventNumber)
	if err != nil {
		return 0, err
	}

	return lastEventNumber, nil
}

func (cg *NamedConsumers) Stream(rw http.ResponseWriter, req *http.Request) {
	consumerName := chi.URLParam(req, "name")
	err := cg.lock.Lock(req.Context(), consumerName)
	if err != nil {
		http.Error(rw, "Could not acquire lock for named consumer", http.StatusInternalServerError)
		return
	}

	// Release lock when streaming is finished
	defer cg.lock.Release(consumerName)

	offset := getLastEvent(
		cg.loader.MatchingStream(req.Context(), events.Matcher{
			UriTemplates: []string{commitOffsetStreamFromConsumerName(consumerName)},
		}),
	)

	if offset != nil {
		lastEventNumber, err := getCommittedOffsetFromEvent(offset)
		if err != nil {
			http.Error(rw, err.Error(), http.StatusInternalServerError)
			return
		}

		req.Header.Set("Last-Fossil-Event-Number", strconv.Itoa(lastEventNumber))
	}

	cg.sseRouter.StreamEvents(rw, req)
}

func (cg *NamedConsumers) CommitOffset(rw http.ResponseWriter, req *http.Request) {
	consumerName := chi.URLParam(req, "name")
	lastEventId := req.Header.Get("Last-Event-Id")
	lastEventNumber := req.Header.Get("Last-Fossil-Event-Number")
	if lastEventId == "" && lastEventNumber == "" {
		http.Error(rw, "Missing 'Last-Event-Id' or 'Last-Fossil-Event-Number' header.", http.StatusBadRequest)
		return
	}

	if lastEventNumber == "" {
		event, err := cg.store.Find(req.Context(), lastEventId)
		if err != nil {
			_, eventIsNotFound := err.(*EventNotFound)
			if eventIsNotFound {
				http.Error(rw, "Event is not found", http.StatusNotFound)
			} else {
				http.Error(rw, err.Error(), http.StatusInternalServerError)
			}

			return
		}

		lastEventNumber = strconv.Itoa(events.GetEventNumber(*event))
	}

	lastEventNumberAsInteger, err := strconv.Atoi(lastEventNumber)
	if err != nil {
		http.Error(rw, "'Last-Fossil-Event-Number' header must be an integer.", http.StatusBadRequest)
		return
	}

	event := cloudevents.NewEvent("0.3")
	event.SetID(uuid.NewMD5(consumerGroupNamespace, []byte(consumerName)).String())
	event.SetSource("fossil")
	event.SetType(consumerGroupEventType)
	err = event.SetData(lastEventNumberAsInteger)
	if err != nil {
		http.Error(rw, err.Error(), http.StatusInternalServerError)
		return
	}

	events.SetEventToReplaceExistingOne(&event)

	err = cg.store.Store(req.Context(), commitOffsetStreamFromConsumerName(consumerName), &event)
	if err != nil {
		http.Error(rw, err.Error(), http.StatusInternalServerError)
		return
	}

	rw.WriteHeader(http.StatusOK)
}
