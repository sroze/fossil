package collector

import "github.com/go-chi/chi"

func (c *Collector) Routes() *chi.Mux {
	router := chi.NewRouter()
	router.Post("/", c.CollectEvent)
	return router
}
