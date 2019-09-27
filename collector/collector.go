package collector

import (
	"context"
	"github.com/sroze/birdie-events-api/acknowledgment"
	"io/ioutil"
	"log"
	"net/http"
	"time"

	"github.com/go-chi/render"
	"github.com/google/uuid"

	"github.com/segmentio/kafka-go"
)

type Event struct {
	EventType  string `json:"event_type"`
	Payload string `json:"payload"`
}

func NewCollector(Writer *kafka.Writer, broadcaster *acknowledgment.StringChannelBroadcaster) *Collector {
	return &Collector{
		Writer,
		broadcaster,
	}
}


type Collector struct {
	Writer *kafka.Writer
	broadcaster *acknowledgment.StringChannelBroadcaster
}

func (c *Collector) CollectEvent(w http.ResponseWriter, r *http.Request) {
	body, err := ioutil.ReadAll(r.Body)
	if err != nil {
		log.Printf("Error reading body: %v", err)
		w.WriteHeader(500)
		render.JSON(w, r, make(map[string]string));
		return
	}
	messageId, err := uuid.New().MarshalText()
	if err != nil {
		log.Printf("Could not generate UUID: %v", err)
		w.WriteHeader(500)
		render.JSON(w, r, make(map[string]string));
		return
	}

	Headers := []kafka.Header{
		kafka.Header{
			Key: "message-id",
			Value: messageId,
		},
	}

	acknowledge := r.Header["Acknowledge"]
	if len(acknowledge) != 0 {
		Headers = append(Headers, kafka.Header{
			Key:   "acknowledge-to",
			Value: []byte("acknowledgement-topic"),
		})
	}

	message := kafka.Message{
		Key:   []byte("Key-A"),
		Value: body,
		Headers: Headers,
	}


	var listener acknowledgment.AckListener
	if len(acknowledge) != 0 {
		listener = acknowledgment.NewAckListener(c.broadcaster, string(messageId))
		listener.Listen()
	}

	err = c.Writer.WriteMessages(context.Background(), message)
	if err != nil {
		log.Printf("Error sending message: %v", err)
		w.WriteHeader(500)
		render.JSON(w, r, make(map[string]string));
		return
	}

	if len(acknowledge) != 0 {
		err, _ = listener.WaitsFor(10 * time.Second)

		if err != nil {
			log.Printf("Error sending message: %v", err)
			w.WriteHeader(500)
			render.JSON(w, r, make(map[string]string));
			return
		}
	}


	w.WriteHeader(201)

	response := make(map[string]string)
	response["message"] = "Successfully collected."
	response["id"] = string(messageId)

	render.JSON(w, r, response)
}
