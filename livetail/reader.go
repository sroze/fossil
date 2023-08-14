package livetail

import (
	"context"
	"github.com/sroze/fossil/streamstore"
	"strconv"
)

type Reader interface {
	// Read reads events and sends them to the channel.
	Read(ctx context.Context, startingPosition string, ch chan streamstore.ReadItem)
}

type StreamReader struct {
	store  streamstore.Store
	stream string
}

func NewStreamReader(store streamstore.Store, stream string) *StreamReader {
	return &StreamReader{
		store:  store,
		stream: stream,
	}
}

func (sr *StreamReader) Read(ctx context.Context, startingPosition string, ch chan streamstore.ReadItem) {
	i, err := strconv.ParseInt(startingPosition, 10, 64)
	if err != nil {
		ch <- streamstore.ReadItem{
			Error: err,
		}
		return
	}

	sr.store.Read(ctx, sr.stream, i, ch)
}
