package main

import (
	"github.com/go-chi/chi"
	"github.com/sroze/fossil"
	http2 "github.com/sroze/fossil/http"
	"github.com/sroze/fossil/postgres"
	"github.com/sroze/fossil/streaming"
	"log"
	"net/http"
	"os"
)

func main() {
	conn, err := postgres.NewPostgresConnection(os.Getenv("DATABASE_URL"))
	if err != nil {
		log.Panicf("Storage err: %s\n", err.Error()) // panic if there is an error
	}

	s := postgres.NewStorage(conn)
	p := postgres.NewPublisher(conn)

	consumer, err := postgres.NewConsumer(os.Getenv("DATABASE_URL"))
	if err != nil {
		log.Panicf("Consumer err: %s\n", err.Error()) // panic if there is an error
	}

	eventStreamFactory := streaming.NewEventStreamFactory(s)
	go consumer.ConsumeFor(eventStreamFactory.Source)

	router := http2.NewFossilServer(
		postgres.NewCollectorWrappedInTransaction(
			fossil.NewCollector(s, p),
			conn,
		),
		eventStreamFactory,
	)

	walkFunc := func(method string, route string, handler http.Handler, middlewares ...func(http.Handler) http.Handler) error {
		log.Printf("%s %s\n", method, route) // Walk and print out all routes
		return nil
	}
	if err := chi.Walk(router, walkFunc); err != nil {
		log.Panicf("Logging err: %s\n", err.Error()) // panic if there is an error
	}

	log.Fatal(http.ListenAndServe(":8080", router)) // Note, the port is usually gotten from the environment.
}
