package segmentsstore

import (
	"context"
	"github.com/sroze/fossil/streamstore"
)

// TODO: this is the black magic to figure out.
type Position string

type QueryItem struct {
	EventInStream *streamstore.EventInStream
	Position      *Position
	Error         error
}

type QueryApi interface {
	// Query returns a channel of `ReadItem` that will be filled with the
	// content of the segments that are relevant to the query.
	Query(ctx context.Context, prefix string, startingPosition Position, ch chan QueryItem)
}
