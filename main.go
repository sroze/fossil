package main

import (
	"github.com/go-chi/chi"
	"github.com/go-chi/chi/middleware"
	"github.com/go-chi/render"
	"github.com/sroze/fossil/publisher"
	"github.com/sroze/fossil/storage"
	"log"
	"net/http"
	"os"

	"github.com/sroze/fossil/collector"
)

func NewFossilServer(store storage.EventStore, publisher publisher.Publisher) *chi.Mux {
	router := chi.NewRouter()
	router.Use(
		render.SetContentType(render.ContentTypeJSON), // Set content-Type headers as application/json
		middleware.Logger,                             // Log API request calls
		middleware.DefaultCompress,                    // Compress results, mostly gzipping assets and json
		middleware.RedirectSlashes,                    // Redirect slashes to no slash URL versions
		middleware.Recoverer,                          // Recover from panics without crashing server
	)

	c := collector.NewCollector(store, publisher)

	router.Mount("/collect", NewRouter(c).Routes())

	return router
}

func main() {
	s, err := storage.NewPostgresStorage(os.Getenv("DATABASE_URL"))
	if err != nil {
		log.Panicf("Storage err: %s\n", err.Error()) // panic if there is an error
	}

	p, err := publisher.NewKafkaPublisher()
	if err != nil {
		log.Panicf("Publisher err: %s\n", err.Error()) // panic if there is an error
	}

	router := NewFossilServer(s, p)

	walkFunc := func(method string, route string, handler http.Handler, middlewares ...func(http.Handler) http.Handler) error {
		log.Printf("%s %s\n", method, route) // Walk and print out all routes
		return nil
	}
	if err := chi.Walk(router, walkFunc); err != nil {
		log.Panicf("Logging err: %s\n", err.Error()) // panic if there is an error
	}

	log.Fatal(http.ListenAndServe(":8080", router)) // Note, the port is usually gotten from the environment.
}
