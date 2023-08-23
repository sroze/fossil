package kv

import "context"

type Condition struct {
	MustBeEmpty bool
	// MustExist        bool
	// MustContainValue []byte
}

type Write struct {
	Key       []byte
	Value     []byte
	Condition *Condition
}

type KeyPair struct {
	Key   []byte
	Value []byte
}

type KeyRange struct {
	// Inclusive.
	Start []byte
	// Exclusive.
	End []byte
}

func NewKeyRange(start, end []byte) KeyRange {
	return KeyRange{
		Start: start,
		End:   end,
	}
}

func NewPrefixKeyRange(prefix []byte) KeyRange {
	return KeyRange{
		Start: ConcatBytes(prefix, []byte{0x00}),
		End:   ConcatBytes(prefix, []byte{0xFF}),
	}
}

type ScanOptions struct {
	Backwards bool
	Limit     int
}

type KV interface {
	Write(operations []Write) error
	Get(key []byte) ([]byte, error)
	Scan(ctx context.Context, keyRange KeyRange, options ScanOptions, ch chan KeyPair) error
}
