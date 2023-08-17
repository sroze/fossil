package livetail

import (
	"context"
	"github.com/sroze/fossil/simplestore"
	"strconv"
)

type Reader interface {
	// Read reads events and sends them to the channel.
	Read(ctx context.Context, startingPosition string, ch chan simplestore.ReadItem)
}

type StreamReader struct {
	store  simplestore.Store
	stream string
}

func NewStreamReader(store simplestore.Store, stream string) *StreamReader {
	return &StreamReader{
		store:  store,
		stream: stream,
	}
}

func (sr *StreamReader) Read(ctx context.Context, startingPosition string, ch chan simplestore.ReadItem) {
	i, err := strconv.ParseInt(startingPosition, 10, 64)
	if err != nil {
		ch <- simplestore.ReadItem{
			Error: err,
		}
		return
	}

	sr.store.Read(ctx, sr.stream, ch, simplestore.ReadOptions{
		StartingPosition: i,
	})
}
