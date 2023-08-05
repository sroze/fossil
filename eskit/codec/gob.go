package codec

import (
	"bytes"
	"encoding/gob"
	"fmt"
	"github.com/google/uuid"
	"github.com/sroze/fossil/streamstore"
	"reflect"
)

type GobCodec struct {
	Codec

	knownTypes []reflect.Type
}

func NewGobCodec(objects ...interface{}) Codec {
	types := make([]reflect.Type, len(objects))
	for i, object := range objects {
		types[i] = reflect.TypeOf(object)
		gob.Register(object)
	}

	return &GobCodec{
		knownTypes: types,
	}
}

func (c *GobCodec) Serialize(message interface{}) (streamstore.Event, error) {
	t := reflect.TypeOf(message).String()
	var buf bytes.Buffer
	enc := gob.NewEncoder(&buf)

	if err := enc.Encode(message); err != nil {
		return streamstore.Event{}, err
	}

	return streamstore.Event{
		EventId:   uuid.NewString(),
		EventType: t,
		Payload:   buf.Bytes(),
	}, nil
}

func (c *GobCodec) Deserialize(event streamstore.Event) (interface{}, error) {
	for _, t := range c.knownTypes {
		if t.String() == event.EventType {
			buf := bytes.NewBuffer(event.Payload)
			dec := gob.NewDecoder(buf)

			target := reflect.New(t).Interface()
			if err := dec.Decode(target); err != nil {
				return nil, err
			}

			return target, nil
		}
	}

	return nil, fmt.Errorf("cannot deserialize unknown event type %s", event.EventType)
}
