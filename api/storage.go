package api

import (
	"bytes"
	"encoding/binary"
	"encoding/gob"
	"github.com/apple/foundationdb/bindings/go/src/fdb"
	"github.com/apple/foundationdb/bindings/go/src/fdb/subspace"
)

type EventRow struct {
	EventId   string
	EventType string
	Payload   []byte
}

func DecodeEventRow(b []byte) (*EventRow, error) {
	var row EventRow
	err := gob.NewDecoder(bytes.NewReader(b)).Decode(&row)

	return &row, err
}

func EncodeEventRow(row EventRow) ([]byte, error) {
	var b bytes.Buffer
	err := gob.NewEncoder(&b).Encode(row)

	return b.Bytes(), err
}

func EventInStreamKey(streamSpace subspace.Subspace, position uint64) fdb.KeyConvertible {
	return streamSpace.Sub("events", positionAsByteArray(position))
}

func positionAsByteArray(position uint64) []byte {
	encodedBytes := make([]byte, 8) // uint64 is 8 bytes
	binary.BigEndian.PutUint64(encodedBytes, position)

	return encodedBytes
}

func positionFromByteArray(b []byte) uint64 {
	return binary.BigEndian.Uint64(b)
}
