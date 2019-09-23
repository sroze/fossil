package collector

import (
	"context"
	"io/ioutil"
	"log"
	"net/http"

	"github.com/go-chi/chi"
	"github.com/go-chi/render"

	"github.com/segmentio/kafka-go"
)

type Event struct {
	EventType  string `json:"event_type"`
	Payload string `json:"payload"`
}

func NewCollector(Writer *kafka.Writer) *Collector {
	return &Collector{
		Writer,
	}
}


type Collector struct {
	Writer *kafka.Writer
}

func (c *Collector) Routes() *chi.Mux {
	router := chi.NewRouter()
	router.Post("/", c.CollectEvent)
	return router
}

func (c *Collector) CollectEvent(w http.ResponseWriter, r *http.Request) {
	body, err := ioutil.ReadAll(r.Body)
	if err != nil {
		log.Printf("Error reading body: %v", err)
		w.WriteHeader(500)
		render.JSON(w, r, make(map[string]string));
		return
	}

	err = c.Writer.WriteMessages(context.Background(), kafka.Message{
		Key:   []byte("Key-A"),
		Value: body,
	})
	if err != nil {
		log.Printf("Error sending message: %v", err)
		w.WriteHeader(500)
		render.JSON(w, r, make(map[string]string));
		return
	}

	w.WriteHeader(201)

	response := make(map[string]string)
	response["message"] = "Successfully collected."
	render.JSON(w, r, response)
}
