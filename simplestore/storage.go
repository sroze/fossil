package simplestore

import (
	"bytes"
	"encoding/binary"
	"encoding/gob"
)

type Event struct {
	EventId   string
	EventType string
	Payload   []byte
	Metadata  map[string]string
}

// TODO: move to protobuf
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

func EncodeEventInStream(row EventInStream) ([]byte, error) {
	var b bytes.Buffer
	err := gob.NewEncoder(&b).Encode(row)

	return b.Bytes(), err
}

func DecodeEventInStream(b []byte) (*EventInStream, error) {
	var row EventInStream
	err := gob.NewDecoder(bytes.NewReader(b)).Decode(&row)

	return &row, err
}

func positionAsByteArray(position int64) []byte {
	encodedBytes := make([]byte, 8) // int64 is 8 bytes
	binary.BigEndian.PutUint64(encodedBytes, uint64(position))

	return encodedBytes
}

func positionFromByteArray(b []byte) int64 {
	return int64(binary.BigEndian.Uint64(b))
}
