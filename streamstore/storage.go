package streamstore

import (
	"bytes"
	"encoding/binary"
	"encoding/gob"
	"fmt"
	"github.com/apple/foundationdb/bindings/go/src/fdb"
	"github.com/apple/foundationdb/bindings/go/src/fdb/subspace"
	"github.com/apple/foundationdb/bindings/go/src/fdb/tuple"
)

// TODO: Move to shared types with client.
type Event struct {
	EventId   string
	EventType string
	Payload   []byte
}

func EventInStreamKey(stream string, position uint64) fdb.KeyConvertible {
	return eventsInStreamSpace(streamInStoreSpace(stream)).Sub(positionAsByteArray(position))
}

func ReverseEventInStreamKey(key fdb.Key) (string, uint64, error) {
	keyTuples, err := subspace.Sub(tuple.Tuple{"s"}).Unpack(key)
	if err != nil {
		return "", 0, err
	}

	stream := keyTuples[0].(string)
	position := positionFromByteArray(keyTuples[2].([]byte))

	return stream, position, nil
}

func StreamEventsKeyRange(stream string, startingPosition uint64) fdb.Range {
	streamSpace := streamInStoreSpace(stream)
	streamEventsSpace := eventsInStreamSpace(streamSpace)

	rangeByteStart := []byte{0x00}
	if startingPosition > 0 {
		rangeByteStart = positionAsByteArray(startingPosition)
	}

	// FIXME: Try using something like `fdb.Key(append(tuple.Tuple{"indexFor1"}.Pack(), 0x00))` -- the current range
	// 	      might not contain all events.
	return fdb.KeyRange{
		Begin: streamEventsSpace.Pack(tuple.Tuple{rangeByteStart}),
		End:   streamEventsSpace.Pack(tuple.Tuple{[]byte{0xFF}}),
	}
}

func EventInStreamFromKeyValue(kv fdb.KeyValue) (EventInStream, error) {
	_, position, err := ReverseEventInStreamKey(kv.Key)
	if err != nil {
		return EventInStream{}, fmt.Errorf("error while unpacking stream item key: %w", err)
	}

	row, err := DecodeEvent(kv.Value)
	if err != nil {
		return EventInStream{}, fmt.Errorf("error while decoding stream item: %w", err)
	}

	return EventInStream{
		Event:    *row,
		Position: position,
	}, nil
}

func DecodeEvent(b []byte) (*Event, error) {
	var row Event
	err := gob.NewDecoder(bytes.NewReader(b)).Decode(&row)

	return &row, err
}

func EncodeEvent(row Event) ([]byte, error) {
	var b bytes.Buffer
	err := gob.NewEncoder(&b).Encode(row)

	return b.Bytes(), err
}

func streamInStoreSpace(stream string) subspace.Subspace {
	return subspace.Sub(tuple.Tuple{"s"}).Sub(stream)
}

func eventsInStreamSpace(streamSpace subspace.Subspace) subspace.Subspace {
	return streamSpace.Sub("events")
}

func headInStreamKey(stream string) fdb.KeyConvertible {
	return streamInStoreSpace(stream).Sub("head")
}

func positionAsByteArray(position uint64) []byte {
	encodedBytes := make([]byte, 8) // uint64 is 8 bytes
	binary.BigEndian.PutUint64(encodedBytes, position)

	return encodedBytes
}

func positionFromByteArray(b []byte) uint64 {
	return binary.BigEndian.Uint64(b)
}
