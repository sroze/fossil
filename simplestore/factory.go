package simplestore

import (
	"github.com/sroze/fossil/kv"
)

type SimpleStore struct {
	kv       kv.KV
	keySpace []byte

	positionIndexedKeyFactory *PositionIndexedEventKeyFactory
	streamIndexedKeyFactory   *StreamIndexEventKeyFactory
}

func NewStore(kv kv.KV, keySpace string) *SimpleStore {
	return &SimpleStore{
		kv:                        kv,
		keySpace:                  []byte(keySpace),
		positionIndexedKeyFactory: &PositionIndexedEventKeyFactory{keySpace: []byte(keySpace)},
		streamIndexedKeyFactory:   &StreamIndexEventKeyFactory{keySpace: []byte(keySpace)},
	}
}
