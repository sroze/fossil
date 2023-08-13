package streamstore

import (
	"github.com/apple/foundationdb/bindings/go/src/fdb"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type AppendResult struct {
	Position int64
}

type AppendToStream struct {
	Stream           string
	Events           []Event
	ExpectedPosition *int64
}

// TODO: use a custom for the conflict (@see https://earthly.dev/blog/golang-errors/)
// var FailedPrecondition = errors.New("expected position %d, but got %d.")

func (ss FoundationDBStore) Write(commands []AppendToStream) ([]AppendResult, error) {
	results := make([]AppendResult, len(commands))
	_, err := ss.db.Transact(func(transaction fdb.Transaction) (interface{}, error) {
		for i, command := range commands {
			r, err := ss.appendToStream(transaction, command)
			if err != nil {
				return nil, err
			}

			results[i] = r
		}

		if ss.hooks.OnWrite != nil {
			err := ss.hooks.OnWrite(transaction, commands, results)
			if err != nil {
				return nil, err
			}
		}

		return nil, nil
	})

	return results, err
}

func (ss FoundationDBStore) appendToStream(t fdb.Transaction, command AppendToStream) (AppendResult, error) {
	headKey := headInStreamKey(command.Stream)
	head := t.Get(headKey).MustGet()

	// Get the current currentStreamPosition.
	var currentStreamPosition int64
	if head == nil {
		currentStreamPosition = 0
	} else {
		currentStreamPosition = positionFromByteArray(head)
	}

	if command.ExpectedPosition != nil {
		if *command.ExpectedPosition != currentStreamPosition {
			return AppendResult{}, status.Errorf(codes.FailedPrecondition,
				"Expected position %d, but got %d.", *command.ExpectedPosition, currentStreamPosition)
		}
	}

	for _, event := range command.Events {
		// AdvanceTo the stream position by one for each event.
		currentStreamPosition = currentStreamPosition + 1

		row, err := EncodeEvent(event)
		if err != nil {
			return AppendResult{}, err
		}

		t.Set(EventInStreamKey(command.Stream, currentStreamPosition), row)
	}

	// Update the head position.
	t.Set(headKey, positionAsByteArray(currentStreamPosition))

	return AppendResult{
		Position: currentStreamPosition,
	}, nil
}
