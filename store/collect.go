package store

import (
	"fmt"
	cloudevents "github.com/cloudevents/sdk-go"
	httpcloudevents "github.com/cloudevents/sdk-go/pkg/cloudevents/transport/http"
	"github.com/go-chi/chi"
	"github.com/sroze/fossil/events"
	"io/ioutil"
	"net/http"
	"strconv"
)

type CollectorRouter struct {
	collector Collector
}

func NewCollectorRouter(collector Collector) *CollectorRouter {
	return &CollectorRouter{
		collector,
	}
}

func (r *CollectorRouter) Mount(router *chi.Mux) {
	router.Post("/collect", r.CollectEvent)
}

func (r *CollectorRouter) CollectEvent(w http.ResponseWriter, request *http.Request) {
	ctx := request.Context()
	t, err := cloudevents.NewHTTPTransport()

	body, err := ioutil.ReadAll(request.Body)
	if err != nil {
		fmt.Printf("failed to handle request: %s", err)
		w.WriteHeader(http.StatusBadRequest)
		_, _ = w.Write([]byte(`{"error":"Invalid request"}`))
		return
	}

	event, err := t.MessageToEvent(ctx, &httpcloudevents.Message{
		Header: request.Header,
		Body:   body,
	})
	if err != nil {
		fmt.Printf("failed to handle request: %s", err)
		w.WriteHeader(http.StatusBadRequest)
		_, _ = w.Write([]byte(`{"error":"Invalid request"}`))
		return
	}

	err = event.Validate()
	if err != nil {
		fmt.Printf("failed to handle request: %s", err)
		w.WriteHeader(http.StatusBadRequest)
		_, _ = w.Write([]byte(`{"error":"Invalid request"}`))
		return
	}

	// Add more to the context
	streams := request.Header[fossilStreamHeader]
	if len(streams) == 0 {
		w.WriteHeader(http.StatusBadRequest)
		_, _ = w.Write([]byte(`{"error":"You need to set a stream in the header"}`))
		return
	} else if len(streams) > 1 {
		w.WriteHeader(http.StatusBadRequest)
		_, _ = w.Write([]byte(`{"error":"Only supports one stream (for now)."}`))
		return
	}

	// Add event extensions
	events.SetStream(event, streams[0])
	if request.Header.Get(fossilReplaceHeader) == "true" {
		events.SetEventToReplaceExistingOne(event)
	}

	expectedEventNumber := request.Header.Get(fossilExpectedSequenceNumberHeader)
	if expectedEventNumber != "" {
		expectedEventNumberAsInt, err := strconv.Atoi(expectedEventNumber)
		if err != nil {
			w.WriteHeader(http.StatusBadRequest)
			_, _ = w.Write([]byte(`{"error":"Expected sequence number is invalid."}`))
			return
		}

		events.SetExpectedSequenceNumber(event, expectedEventNumberAsInt)
	}

	err = r.collector.Collect(ctx, event)

	if err != nil {
		if _, isDuplicate := err.(*DuplicateEventError); isDuplicate {
			w.WriteHeader(http.StatusBadRequest)
			_, _ = w.Write([]byte(`{"error":"Event with such identifier already exists."}`))
			return
		}

		if _, isSequenceError := err.(*SequenceNumberDoNotMatchError); isSequenceError {
			w.WriteHeader(http.StatusConflict)
			_, _ = w.Write([]byte(`{"error":"Event sequence did not match."}`))
			return
		}

		fmt.Printf("failed to collect event: %s", err)
		w.WriteHeader(http.StatusInternalServerError)
		_, _ = w.Write([]byte(`{"error":"Something went wrong."}`))
	}

	w.Header().Set(fossilEventNumberHeader, strconv.Itoa(events.GetEventNumber(*event)))
	w.Header().Set(fossilSequenceNumberHeader, strconv.Itoa(events.GetSequenceNumberInStream(*event)))

	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(`{}`))
}
