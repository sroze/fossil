package store

import (
	"context"
	"github.com/sroze/fossil/simplestore"
)

type PositionCursor string

type QueryItem struct {
	EventInStream *simplestore.EventInStream
	Position      *PositionCursor
	Error         error
}

type QueryApi interface {
	// Query returns a channel of `ReadItem` that will be filled with the
	// content of the segments that are relevant to the query.
	Query(ctx context.Context, prefix string, startingPosition PositionCursor, ch chan QueryItem)
}
