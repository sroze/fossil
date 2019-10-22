package http

import (
	"github.com/go-chi/chi"
	"github.com/go-chi/chi/middleware"
	"github.com/go-chi/render"
	"github.com/sroze/fossil/collector"
	"github.com/sroze/fossil/streaming"
)

var fossilStreamHeader = "Fossil-Stream"
var fossilReplaceHeader = "Fossil-Replace"

type Router struct {
	collector          collector.Collector
	eventStreamFactory *streaming.EventStreamFactory
}

func NewFossilServer(
	collector collector.Collector,
	factory *streaming.EventStreamFactory,
	store collector.EventStore,
	loader collector.EventLoader,
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
	NewConsumerGroup(sseRouter, store, loader).Mount(router)

	return router
}
