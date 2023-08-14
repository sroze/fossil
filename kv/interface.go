package kv

import "errors"

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

var ErrConditionalWriteFails = errors.New("conditional write failed")

type KeyRange struct {
	// Inclusive.
	Start []byte
	// Exclusive.
	End []byte
}

type KV interface {
	Write(operations []Write) error
	Get(key []byte) ([]byte, error)
	Scan(keyRange KeyRange, withValues bool, backwards bool) ([]KeyPair, error)
}
