package simplestore

import (
	"github.com/sroze/fossil/kv"
	"sync"
)

type SimpleStore struct {
	kv       kv.KV
	keySpace []byte

	positionIndexedKeyFactory *PositionIndexedEventKeyFactory
	streamIndexedKeyFactory   *StreamIndexEventKeyFactory

	positionMutex sync.Mutex
}

func NewStore(kv kv.KV, keySpace string) *SimpleStore {
	return &SimpleStore{
		kv:                        kv,
		keySpace:                  []byte(keySpace),
		positionIndexedKeyFactory: &PositionIndexedEventKeyFactory{keySpace: []byte(keySpace)},
		streamIndexedKeyFactory:   &StreamIndexEventKeyFactory{keySpace: []byte(keySpace)},
	}
}
