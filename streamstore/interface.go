package streamstore

import "context"

type Store interface {
	Read(ctx context.Context, stream string, startingPosition int64, ch chan ReadItem)
	Write(commands []AppendToStream) ([]AppendResult, error)
}

type ReadItem struct {
	EventInStream     *EventInStream
	EndOfStreamSignal *EndOfStreamSignal
	Error             error
}

type EventInStream struct {
	Event Event

	// Position of the event in the stream. Starts at 0.
	Position int64
}

type EndOfStreamSignal struct {
	// Position of the stream. It is the position of next to-be-written event (or aldo
	// described as the number of events in the stream).
	StreamPosition int64
}
