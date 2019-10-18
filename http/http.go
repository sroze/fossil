package http

import (
	"github.com/go-chi/chi"
	"github.com/go-chi/chi/middleware"
	"github.com/go-chi/render"
	"github.com/sroze/fossil"
	"github.com/sroze/fossil/streaming"
)

var fossilStreamHeader = "Fossil-Stream"

type Router struct {
	collector fossil.Collector
	eventStreamFactory *streaming.EventStreamFactory
}

func NewFossilServer(collector fossil.Collector, factory *streaming.EventStreamFactory) *chi.Mux {
	router := chi.NewRouter()
	router.Use(
		render.SetContentType(render.ContentTypeJSON), // Set content-Type headers as application/json
		middleware.Logger,                             // Log API request calls
		middleware.DefaultCompress,                    // Compress results, mostly gzipping assets and json
		middleware.RedirectSlashes,                    // Redirect slashes to no slash URL versions
		middleware.Recoverer,                          // Recover from panics without crashing server
	)

	router.Mount("/", NewRouter(collector, factory).Routes())

	return router
}

func NewRouter(collector fossil.Collector, eventStreamFactory *streaming.EventStreamFactory) *Router {
	return &Router{
		collector,
		eventStreamFactory,
	}
}

func (r *Router) Routes() *chi.Mux {
	router := chi.NewRouter()
	router.Post("/collect", r.CollectEvent)
	router.Get("/stream", r.StreamEvents)
	return router
}
