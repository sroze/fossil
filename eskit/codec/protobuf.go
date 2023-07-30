package codec

import (
	"fmt"
	"github.com/golang/protobuf/proto"
	"github.com/google/uuid"
	"github.com/sroze/fossil/store/api/streamstore"
	"reflect"
)

type ProtobufTypePair struct {
	TypeName   string
	ActualType proto.Message
}

type ProtobufCodec struct {
	Codec

	events []ProtobufTypePair
}

func NewProtobufCodec(
	events []ProtobufTypePair,
) Codec {
	return &ProtobufCodec{
		events: events,
	}
}

func (e *ProtobufCodec) Serialize(i interface{}) (streamstore.Event, error) {
	message, ok := i.(proto.Message)
	if !ok {
		return streamstore.Event{}, fmt.Errorf("cannot serialize %s", reflect.TypeOf(i).String())
	}

	for _, pair := range e.events {
		if reflect.TypeOf(message).String() == reflect.TypeOf(pair.ActualType).String() {
			bytes, err := proto.Marshal(message)

			return streamstore.Event{
				EventId:   uuid.NewString(),
				EventType: pair.TypeName,
				Payload:   bytes,
			}, err
		}
	}

	return streamstore.Event{}, fmt.Errorf("no event type found for %s when serializing", reflect.TypeOf(message).String())
}

func (e *ProtobufCodec) Deserialize(event streamstore.Event) (interface{}, error) {
	for _, pair := range e.events {
		if event.EventType == pair.TypeName {
			message := reflect.New(reflect.TypeOf(pair.ActualType).Elem()).Interface().(proto.Message)
			err := proto.Unmarshal(event.Payload, message)

			return message, err
		}
	}

	return nil, fmt.Errorf("no event type found for %s when deserializing", event.EventType)
}
