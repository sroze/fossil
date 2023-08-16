package codec

import (
	"github.com/sroze/fossil/simplestore"
)

type Codec interface {
	// Serialize returns the encoded event, or an error.
	// The message is a *pointer* instance of the message.
	Serialize(message interface{}) (simplestore.Event, error)

	// Deserialize returns the decoded event, or an error. The event is a pointer to the
	// type that was serialized.
	Deserialize(event simplestore.Event) (interface{}, error)
}
