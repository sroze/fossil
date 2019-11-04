package store

import (
	"errors"
	"fmt"
	"github.com/go-chi/chi"
	"github.com/sroze/fossil/events"
	"net/http"
	"strconv"
)

type SSERouter struct {
	eventStreamFactory *EventStreamFactory
	store              EventStore
}

func NewSSERouter(eventStreamFactory *EventStreamFactory, store EventStore) *SSERouter {
	return &SSERouter{
		eventStreamFactory,
		store,
	}
}

func matcherFromRequest(store EventStore, req *http.Request) (events.Matcher, error) {
	matcher := events.Matcher{}
	matcher.UriTemplates = req.URL.Query()["stream"]

	if len(matcher.UriTemplates) == 0 {
		return matcher, errors.New("no 'stream' template found in URL")
	}

	lastEventNumber := req.Header.Get("Last-Fossil-Event-Number")
	if lastEventNumber != "" {
		asInteger, err := strconv.Atoi(lastEventNumber)

		if err != nil {
			return matcher, fmt.Errorf("last event id is not a valid integer: %s", err.Error())
		}

		matcher.LastEventNumber = asInteger
	} else if lastEventId := req.Header.Get("Last-Event-Id"); lastEventId != "" {
		event, err := store.Find(req.Context(), lastEventId)
		if err != nil {
			_, eventIsNotFound := err.(*EventNotFound)
			if eventIsNotFound {
				return matcher, fmt.Errorf("event %s is not found", lastEventId)
			}

			return matcher, err
		}

		matcher.LastEventNumber = events.GetEventNumber(*event)
	}

	return matcher, nil
}

func (r *SSERouter) Mount(router *chi.Mux) {
	router.Get("/sse", r.StreamEvents)
}

func (r *SSERouter) StreamEvents(rw http.ResponseWriter, req *http.Request) {
	// Make sure that the writer supports flushing.
	flusher, ok := rw.(http.Flusher)
	if !ok {
		http.Error(rw, "Streaming unsupported!", http.StatusInternalServerError)
		return
	}

	// Set event stream headers
	rw.Header().Set("Content-Type", "text/event-stream")
	rw.Header().Set("Cache-Control", "no-cache")
	rw.Header().Set("Connection", "keep-alive")
	rw.Header().Set("Access-Control-Allow-Origin", "*")

	matcher, err := matcherFromRequest(r.store, req)
	if err != nil {
		http.Error(rw, fmt.Sprintf("Stream matcher was invalid: %s.", err.Error()), http.StatusBadRequest)
		return
	}

	stream := r.eventStreamFactory.NewEventStream(req.Context(), matcher)

	for event := range stream {
		_, err := fmt.Fprintf(rw, "id: %s\n", event.ID())
		if err != nil {
			fmt.Println("error writing id", err)
			continue
		}
		json, err := event.MarshalJSON()
		if err != nil {
			fmt.Println("error marshaling JSON", err)
			continue
		}

		_, err = fmt.Fprintf(rw, "data: %s\n\n", string(json))
		if err != nil {
			fmt.Println("error sending data", err)
			continue
		}

		flusher.Flush()
	}
}
