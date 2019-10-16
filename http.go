package main

import (
	"context"
	"fmt"
	cloudevents "github.com/cloudevents/sdk-go"
	httpcloudevents "github.com/cloudevents/sdk-go/pkg/cloudevents/transport/http"
	"github.com/go-chi/chi"
	"github.com/sroze/fossil/collector"
	"io/ioutil"
	"net/http"
)


type Router struct {
	collector *collector.Collector
}

func NewRouter(collector *collector.Collector) *Router {
	return &Router{
		collector,
	}
}

func (r *Router) Routes() *chi.Mux {
	router := chi.NewRouter()
	router.Post("/", r.CollectEvent)
	return router
}

func (r *Router) CollectEvent(w http.ResponseWriter, request *http.Request) {
	ctx := context.Background()
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

	fmt.Println("Collecting...")
	err = r.collector.Collect(*event)

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
