package simplestore

import (
	"context"
	"github.com/sroze/fossil/kv"
	"strings"
)

func (ss *SimpleStore) Query(ctx context.Context, prefix string, startingPosition int64, ch chan QueryItem) {
	keyCh := make(chan kv.KeyPair)
	go func() {
		defer close(ch)

		for keyPair := range keyCh {
			position, err := ss.positionIndexedKeyFactory.Reverse(keyPair.Key)
			if err != nil {
				ch <- QueryItem{Error: err}
				return
			}

			eventInStream, err := DecodeEventInStream(keyPair.Value)
			if err != nil {
				ch <- QueryItem{Error: err}
				return
			}

			if !strings.HasPrefix(eventInStream.Stream, prefix) {
				continue
			}

			ch <- QueryItem{
				EventInStream: eventInStream,
				Position:      position,
			}
		}
	}()

	err := ss.kv.Scan(
		ss.positionIndexedKeyFactory.RangeStartingAt(startingPosition),
		kv.ScanOptions{},
		keyCh,
	)

	if err != nil {
		ch <- QueryItem{Error: err}
	}
}
