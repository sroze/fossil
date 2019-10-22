package http

import (
	"fmt"
	"github.com/go-chi/chi"
	"github.com/sroze/fossil"
	"github.com/sroze/fossil/postgres"
	"github.com/sroze/fossil/streaming"

	"log"
	"net/http"
	"os"
	"strconv"
)

func StartServer() error {
	pool, err := postgres.NewPostgresPool(os.Getenv("DATABASE_URL"))
	if err != nil {
		return err
	}

	s := postgres.NewStorage(pool)
	p := postgres.NewPublisher(pool)

	consumer, err := postgres.NewConsumer(os.Getenv("DATABASE_URL"))
	if err != nil {
		return err
	}

	eventStreamFactory := streaming.NewEventStreamFactory(s)
	go consumer.ConsumeFor(eventStreamFactory.Source)

	router := NewFossilServer(
		postgres.NewCollectorWrappedInTransaction(
			fossil.NewCollector(s, p),
			pool,
		),
		eventStreamFactory,
		s,
		s,
	)

	walkFunc := func(method string, route string, handler http.Handler, middlewares ...func(http.Handler) http.Handler) error {
		log.Printf("%s %s\n", method, route) // Walk and print out all routes
		return nil
	}
	if err := chi.Walk(router, walkFunc); err != nil {
		return err
	}

	port, err := strconv.Atoi(os.Getenv("SERVER_PORT"))
	if err != nil {
		return err
	}

	return http.ListenAndServe(fmt.Sprintf(":%d", port), router)
}
