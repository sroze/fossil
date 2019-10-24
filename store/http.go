package store

import (
	"github.com/go-chi/chi"
	"github.com/go-chi/chi/middleware"
	"github.com/go-chi/render"
)

var fossilStreamHeader = "Fossil-Stream"
var fossilReplaceHeader = "Fossil-Replace"
var fossilSequenceNumberHeader = "Fossil-Sequence-Number"
var fossilExpectedSequenceNumberHeader = "Fossil-Expected-Sequence-Number"
var fossilEventNumberHeader = "Fossil-Event-Number"

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
	NewCollectorRouter(collector).Mount(router)
	NewConsumerGroup(sseRouter, store, loader, lock).Mount(router)

	return router
}
