package collector

import (
	"net/http"

	"github.com/go-chi/chi"
	"github.com/go-chi/render"
)

type Event struct {
	EventType  string `json:"event_type"`
	Payload string `json:"payload"`
}

func Routes() *chi.Mux {
	router := chi.NewRouter()
	router.Post("/", CollectEvent)
	return router
}

func CollectEvent(w http.ResponseWriter, r *http.Request) {
	response := make(map[string]string)
	response["message"] = "Successfully collected."

	w.WriteHeader(201)
	render.JSON(w, r, response)
}
