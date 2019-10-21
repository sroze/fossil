package http

import (
	"fmt"
	cloudevents "github.com/cloudevents/sdk-go"
	httpcloudevents "github.com/cloudevents/sdk-go/pkg/cloudevents/transport/http"
	"github.com/sroze/fossil"
	"io/ioutil"
	"net/http"
	"strconv"
)

func (r *Router) CollectEvent(w http.ResponseWriter, request *http.Request) {
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
		fmt.Printf("do not have stream name: %s", request.Header)
		w.WriteHeader(http.StatusBadRequest)
		_, _ = w.Write([]byte(`{"error":"You need to set a stream"}`))
		return
	} else if len(streams) > 1 {
		w.WriteHeader(http.StatusBadRequest)
		_, _ = w.Write([]byte(`{"error":"Only supports one stream (for now)."}`))
		return
	}

	// Add event extensions
	fossil.SetStream(event, streams[0])
	if request.Header.Get(fossilReplaceHeader) == "true" {
		fossil.SetEventToReplaceExistingOne(event)
	}

	err = r.collector.Collect(ctx, event)

	if err != nil {
		_, ok := err.(*fossil.DuplicateEventError)
		if ok {
			w.WriteHeader(http.StatusBadRequest)
			_, _ = w.Write([]byte(`{"error":"Event with such identifier already exists."}`))
		} else {
			fmt.Printf("failed to collect event: %s", err)
			w.WriteHeader(http.StatusInternalServerError)
			_, _ = w.Write([]byte(`{"error":"Something went wrong."}`))
		}
		return
	}

	w.Header().Set("Fossil-Event-Number", strconv.Itoa(fossil.GetEventNumber(*event)))
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(`{}`))
}
