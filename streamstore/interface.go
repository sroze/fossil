package streamstore

import "context"

type Store interface {
	Read(ctx context.Context, stream string, startingPosition uint64, ch chan ReadItem)

	// ReadAndFollow reads the stream and listens for new events.
	//
	// This function is blocking and will return only when the context is done.
	//
	// If not nil, the `endOfStream` channel receives the position of the last event read
	// when the end of the stream has been reached. As the stream continues to be followed,
	// the channel will receive the position of the last events read. It is not guaranteed
	// to receive the position of all events.
	ReadAndFollow(ctx context.Context, stream string, startingPosition uint64, ch chan ReadItem)

	// WaitForEvent waits for an event to be written to the stream and returns the position of the event.
	WaitForEvent(ctx context.Context, stream string, currentPosition uint64) error

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
	Position uint64
}

type EndOfStreamSignal struct {
	// Position of the stream. It is the position of next to-be-written event (or aldo
	// described as the number of events in the stream).
	StreamPosition uint64
}
