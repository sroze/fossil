package main

import (
	"context"
	"fmt"
	"github.com/segmentio/kafka-go"
	"github.com/sroze/fossil/acknowledgment"
	"log"
	"net/http"
	"time"

	"github.com/go-chi/chi"
	"github.com/go-chi/chi/middleware"
	"github.com/go-chi/render"

	"github.com/sroze/fossil/collector"
)

func Routes() *chi.Mux {
	router := chi.NewRouter()
	router.Use(
		render.SetContentType(render.ContentTypeJSON), // Set content-Type headers as application/json
		middleware.Logger,                             // Log API request calls
		middleware.DefaultCompress,                    // Compress results, mostly gzipping assets and json
		middleware.RedirectSlashes,                    // Redirect slashes to no slash URL versions
		middleware.Recoverer,                          // Recover from panics without crashing server
	)

	broadcaster := acknowledgment.NewStringChannelBroadcaster(0)

	// TODO: acknowledgement-topic to be delete over the last minute or so (i.e. max timeout)
	r := kafka.NewReader(kafka.ReaderConfig{
		Brokers:   []string{"localhost:9092"},
		Topic:     "acknowledgement-topic",
		MaxWait: 20 * time.Millisecond,
	})

	go func() {
		for {
			m, err := r.ReadMessage(context.Background())
			if err != nil {
				break
			}

			fmt.Printf("read ack message: %s\n", string(m.Value))
			broadcaster.Source <- string(m.Value)
		}

		err := r.Close()
		if err != nil {
			fmt.Printf("Could not close connection: %s", err)
		}

		fmt.Print("Acknowledgment listener stopped")
	}()

	w := kafka.NewWriter(kafka.WriterConfig{
		Brokers: []string{"localhost:9092"},
		Topic:   "topic-A",
		BatchTimeout: 50 * time.Millisecond,
	})

	c := collector.NewCollector(w, broadcaster)

	router.Route("/v1", func(r chi.Router) {
		r.Mount("/collect", c.Routes())
	})

	return router
}

func main() {
	router := Routes()

	walkFunc := func(method string, route string, handler http.Handler, middlewares ...func(http.Handler) http.Handler) error {
		log.Printf("%s %s\n", method, route) // Walk and print out all routes
		return nil
	}
	if err := chi.Walk(router, walkFunc); err != nil {
		log.Panicf("Logging err: %s\n", err.Error()) // panic if there is an error
	}

	log.Fatal(http.ListenAndServe(":8080", router)) // Note, the port is usually gotten from the environment.
}
