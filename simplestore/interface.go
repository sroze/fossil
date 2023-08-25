package simplestore

import "context"

type Store interface {
	Write(ctx context.Context, commands []AppendToStream) ([]AppendResult, error)
	Read(ctx context.Context, stream string, ch chan ReadItem, options ReadOptions)
	Query(ctx context.Context, prefix string, startingPosition int64, ch chan QueryItem)
}

type ReadItem struct {
	EventInStream     *EventInStream
	EndOfStreamSignal *EndOfStreamSignal
	Error             error
}

type QueryItem struct {
	EventInStream *EventInStream
	Position      int64 // global, within the segment.
	Error         error
}

type ReadOptions struct {
	// The position at which to start reading.
	StartingPosition int64

	// The maximum number of events to read.
	Limit int

	// Whether to read the events in reverse order.
	Backwards bool
}

type EventInStream struct {
	// Stream where the event is stored.
	Stream string

	// Position of the event in the stream. Starts at 0.
	Position int64

	// Event is the actual event.
	Event Event
}

type EndOfStreamSignal struct {
	// Position of the stream. It is the position of next to-be-written event (or aldo
	// described as the number of events in the stream).
	StreamPosition int64
}
