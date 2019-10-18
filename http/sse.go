package http

import (
	"fmt"
	"net/http"
)

func (r *Router) StreamEvents(rw http.ResponseWriter, req *http.Request) {
	// Make sure that the writer supports flushing.
	flusher, ok := rw.(http.Flusher)
	if !ok {
		http.Error(rw, "Streaming unsupported!", http.StatusInternalServerError)
		return
	}

	// Get the stream matcher
	matcher := req.URL.Query().Get("matcher")
	if matcher == "" {
		http.Error(rw, "You need to give a matcher.", http.StatusBadRequest)
		return
	}

	// Set event stream headers
	rw.Header().Set("Content-Type", "text/event-stream")
	rw.Header().Set("Cache-Control", "no-cache")
	rw.Header().Set("Connection", "keep-alive")
	rw.Header().Set("Access-Control-Allow-Origin", "*")

	stream := r.eventStreamFactory.NewEventStream(req.Context(), matcher)

	for {
		event := <-stream

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
