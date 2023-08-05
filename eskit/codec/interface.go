package codec

import (
	"github.com/sroze/fossil/store/streamstore"
)

type Codec interface {
	// Serialize returns the encoded event, or an error.
	// The message is a *pointer* instance of the message.
	Serialize(message interface{}) (streamstore.Event, error)

	// Deserialize returns the decoded event, or an error. The event is a pointer to the
	// type that was serialized.
	Deserialize(event streamstore.Event) (interface{}, error)
}
