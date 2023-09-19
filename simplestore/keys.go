package simplestore

import (
	"bytes"
	"fmt"
	"github.com/sroze/fossil/kv"
)

type PositionIndexedEventKeyFactory struct {
	keySpace []byte
}

func (k PositionIndexedEventKeyFactory) Bytes(position int64) []byte {
	return kv.ConcatBytes(
		k.keySpace,
		[]byte("/e/"),
		positionAsByteArray(position),
	)
}

func (k PositionIndexedEventKeyFactory) Range() kv.KeyRange {
	return kv.NewPrefixKeyRange(kv.ConcatBytes(
		k.keySpace,
		[]byte("/e/"),
	))
}

func (k PositionIndexedEventKeyFactory) RangeStartingAt(startingPosition int64) kv.KeyRange {
	return kv.NewKeyRange(
		kv.ConcatBytes(k.keySpace, []byte("/e/"), positionAsByteArray(startingPosition)),
		kv.ConcatBytes(k.keySpace, []byte("/e/"), []byte{0xFF}),
	)
}

func (k PositionIndexedEventKeyFactory) Reverse(b []byte) (int64, error) {
	if len(b) < len(k.keySpace)+3+8 {
		return 0, fmt.Errorf("invalid key length: %d", len(b))
	} else if bytes.Equal(b[:len(k.keySpace)], k.keySpace) == false {
		return 0, fmt.Errorf("invalid key space: %s", b[:len(k.keySpace)])
	}

	return positionFromByteArray(b[len(k.keySpace)+3:]), nil
}

type StreamIndexEventKeyFactory struct {
	keySpace []byte
}

func (k StreamIndexEventKeyFactory) Bytes(stream string, position int64) []byte {
	return kv.ConcatBytes(
		k.streamKeyPrefix(stream),
		positionAsByteArray(position),
	)
}

func (k StreamIndexEventKeyFactory) Range(stream string) kv.KeyRange {
	return kv.NewPrefixKeyRange(k.streamKeyPrefix(stream))
}

func (k StreamIndexEventKeyFactory) RangeStartingAt(stream string, startingPosition int64) kv.KeyRange {
	prefix := kv.ConcatBytes(
		k.keySpace,
		[]byte("/s/"),
		[]byte(stream),
		[]byte("/"),
	)

	return kv.NewKeyRange(
		kv.ConcatBytes(k.streamKeyPrefix(stream), positionAsByteArray(startingPosition)),
		kv.ConcatBytes(prefix, []byte{0xFF}),
	)
}

func (k StreamIndexEventKeyFactory) Reverse(b []byte) (string, int64, error) {
	if len(b) < len(k.keySpace)+3+1+8 {
		return "", 0, fmt.Errorf("invalid key length: %d", len(b))
	} else if bytes.Equal(b[:len(k.keySpace)], k.keySpace) == false {
		return "", 0, fmt.Errorf("invalid key space: %s", b[:len(k.keySpace)])
	} else if b[len(k.keySpace)-1+3] != '/' {
		return "", 0, fmt.Errorf("invalid key: %s", b)
	} else if b[len(b)-1-8] != '/' {
		return "", 0, fmt.Errorf("invalid key: %s", b)
	}

	positionBytes := b[len(b)-8:]
	streamBytes := b[len(k.keySpace)+3 : len(b)-9]

	return string(streamBytes), positionFromByteArray(positionBytes), nil
}

func (k StreamIndexEventKeyFactory) streamKeyPrefix(stream string) []byte {
	return kv.ConcatBytes(
		k.keySpace,
		[]byte("/s/"),
		[]byte(stream),
		[]byte("/"),
	)
}
