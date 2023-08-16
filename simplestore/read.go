package simplestore

import (
	"context"
	"github.com/sroze/fossil/kv"
)

// FIXME: use `ctx` to cancel the scan
func (ss SimpleStore) Read(ctx context.Context, stream string, startingPosition int64, ch chan ReadItem) {
	keyCh := make(chan kv.KeyPair)
	go func() {
		defer close(ch)

		for keyPair := range keyCh {
			stream, position, err := ss.streamIndexedKeyFactory.Reverse(keyPair.Key)
			if err != nil {
				ch <- ReadItem{Error: err}
				return
			}

			event, err := DecodeEvent(keyPair.Value)
			if err != nil {
				ch <- ReadItem{Error: err}
				return
			}

			ch <- ReadItem{
				EventInStream: &EventInStream{
					Position: position,
					Event:    *event,
					Stream:   stream,
				},
			}
		}
	}()

	err := ss.kv.Scan(ss.streamIndexedKeyFactory.RangeStartingAt(stream, startingPosition), kv.ScanOptions{}, keyCh)

	if err != nil {
		ch <- ReadItem{Error: err}
	}
}
