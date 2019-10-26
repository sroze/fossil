package store

import (
	"fmt"
	"github.com/go-chi/chi"
	"github.com/go-chi/chi/middleware"
	"github.com/go-chi/render"
	"strconv"
	"time"

	"github.com/tomnomnom/linkheader"
)

var fossilStreamHeader = "Fossil-Stream"
var fossilReplaceHeader = "Fossil-Replace"
var fossilSequenceNumberHeader = "Fossil-Sequence-Number"
var fossilExpectedSequenceNumberHeader = "Fossil-Expected-Sequence-Number"
var fossilEventNumberHeader = "Fossil-Event-Number"
var fossilWaitConsumerHeader = "Fossil-Wait-Consumer"

type Router struct {
	collector          Collector
	eventStreamFactory *EventStreamFactory
}

func NewFossilServer(
	collector Collector,
	factory *EventStreamFactory,
	store EventStore,
	loader EventLoader,
	lock DistributedLock,
) *chi.Mux {
	router := chi.NewRouter()
	router.Use(
		render.SetContentType(render.ContentTypeJSON), // Set content-Type headers as application/json
		middleware.Logger,          // Log API request calls
		middleware.DefaultCompress, // Compress results, mostly gzipping assets and json
		middleware.RedirectSlashes, // Redirect slashes to no slash URL versions
		middleware.Recoverer,       // Recover from panics without crashing server
	)

	sseRouter := NewSSERouter(factory)
	sseRouter.Mount(router)
	NewCollectorRouter(collector, NewConsumerWaiter(factory.Broadcaster)).Mount(router)
	NewConsumerGroup(sseRouter, store, loader, lock).Mount(router)
	NewConsumerWaiterRouter(collector).Mount(router)

	return router
}

func parseWaitConsumerHeader(header string, eventId string) ([]WaitConsumerConfiguration, error) {
	var configurations []WaitConsumerConfiguration

	for _, link := range linkheader.Parse(header) {
		timeout := 0
		if timeoutParameter, err := link.Param("timeout"); err == nil {
			timeoutAsInteger, err := strconv.Atoi(timeoutParameter)

			if err == nil {
				timeout = timeoutAsInteger
			}
		}

		if link.URL == "" {
			return configurations, fmt.Errorf("invalid header: %s", header)
		}

		configurations = append(configurations, WaitConsumerConfiguration{
			ConsumerName: link.URL,
			Timeout:      time.Millisecond * time.Duration(timeout),
			EventId:      eventId,
		})
	}

	return configurations, nil
}
