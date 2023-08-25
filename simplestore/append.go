package simplestore

import "context"

type AppendResult struct {
	Position int64
}

type AppendCondition struct {
	// Expects the stream to be empty.
	StreamIsEmpty bool

	// The expected position where the first event should be written. If the stream is empty,
	// `0` would mean at the beginning.
	// When using `StreamIsEmpty` and `WriteAtPosition` together, the expected position is
	// this means starting a stream with a specific position.
	WriteAtPosition int64
}

type AppendToStream struct {
	Stream    string
	Events    []Event
	Condition *AppendCondition
}

func (ss *SimpleStore) Write(ctx context.Context, commands []AppendToStream) ([]AppendResult, error) {
	preparedWrites, results, err := ss.PrepareKvWrites(ctx, commands)
	if err != nil {
		return results, err
	}

	writes, unlock, err := ss.TransformWritesAndAcquirePositionLock(ctx, preparedWrites)
	defer unlock()
	if err != nil {
		return results, err
	}

	err = ss.kv.Write(writes)
	if err != nil {
		_, err = ss.HandleError(err)
	}

	return results, err
}
