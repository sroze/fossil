package server

import (
	"fmt"
	"github.com/sroze/fossil/postgres"
	"github.com/sroze/fossil/store"
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

	eventStreamFactory := store.NewEventStreamFactory(s)
	go consumer.ConsumeFor(eventStreamFactory.Source)

	router := store.NewFossilServer(
		postgres.NewCollectorWrappedInTransaction(
			store.NewCollector(s, p),
			pool,
		),
		eventStreamFactory,
		s,
		s,
		postgres.NewLock(pool),
		os.Getenv("JWT_SECRET"),
	)

	port, err := strconv.Atoi(os.Getenv("SERVER_PORT"))
	if err != nil {
		return err
	}

	return http.ListenAndServe(fmt.Sprintf(":%d", port), router)
}
