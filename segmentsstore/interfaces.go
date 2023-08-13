package segmentsstore

import (
	"context"
	"github.com/sroze/fossil/streamstore"
)

type PositionCursor string

type EventInStore struct {
	Event  streamstore.Event
	Stream string
}

type QueryItem struct {
	EventInStream *EventInStore
	Position      *PositionCursor
	Error         error
}

type QueryApi interface {
	// Query returns a channel of `ReadItem` that will be filled with the
	// content of the segments that are relevant to the query.
	Query(ctx context.Context, prefix string, startingPosition PositionCursor, ch chan QueryItem)
}
