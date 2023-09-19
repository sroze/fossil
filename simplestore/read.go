package simplestore

import (
	"context"
	"github.com/sroze/fossil/kv"
)

func (ss *SimpleStore) Read(ctx context.Context, stream string, ch chan ReadItem, options ReadOptions) {
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

	err := ss.kv.Scan(
		ctx,
		ss.streamIndexedKeyFactory.RangeStartingAt(stream, options.StartingPosition),
		kv.ScanOptions{
			Backwards: options.Backwards,
			Limit:     options.Limit,
		},
		keyCh,
	)

	if err != nil {
		ch <- ReadItem{Error: err}
	}
}
