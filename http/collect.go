package http

import (
	"fmt"
	cloudevents "github.com/cloudevents/sdk-go"
	httpcloudevents "github.com/cloudevents/sdk-go/pkg/cloudevents/transport/http"
	"github.com/sroze/fossil/context"
	"io/ioutil"
	"net/http"
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
		_, _ = w.Write([]byte(`{"error":"Invalid request"}`))
		return
	}

	ctx = context.WithStreams(ctx, streams)

	fmt.Println("Collecting...")
	err = r.collector.Collect(ctx, *event)

	if err != nil {
		fmt.Printf("failed to collect event: %s", err)
		w.WriteHeader(http.StatusInternalServerError)
		_, _ = w.Write([]byte(`{"error":"Something went wrong."}`))
		return
	}

	fmt.Println("Collected.")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(`{}`))
}
