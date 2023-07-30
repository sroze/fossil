package codec

import (
	"github.com/sroze/fossil/store/api/streamstore"
)

type Codec interface {
	Serialize(message interface{}) (streamstore.Event, error)
	Deserialize(event streamstore.Event) (interface{}, error)
}
