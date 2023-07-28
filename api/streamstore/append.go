package streamstore

import (
	"github.com/apple/foundationdb/bindings/go/src/fdb"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type AppendResult struct {
	StreamPosition uint64
}

// TODO: use a custom for the conflict (@see https://earthly.dev/blog/golang-errors/)
// var FailedPrecondition = errors.New("expected position %d, but got %d.")

func (f FoundationDBStore) AppendEvent(t fdb.Transaction, stream string, events []Event, expectedPosition *uint64) (*AppendResult, error) {
	headKey := headInStreamKey(stream)
	head := t.Get(headKey).MustGet()

	// Get the current currentStreamPosition.
	var currentStreamPosition uint64
	if head == nil {
		currentStreamPosition = 0
	} else {
		currentStreamPosition = positionFromByteArray(head)
	}

	if expectedPosition != nil {
		if *expectedPosition != currentStreamPosition {
			return nil, status.Errorf(codes.FailedPrecondition,
				"Expected position %d, but got %d.", *expectedPosition, currentStreamPosition)
		}
	}

	for _, event := range events {
		// Advance the stream position by one for each event.
		currentStreamPosition = currentStreamPosition + 1

		row, err := EncodeEvent(event)
		if err != nil {
			return nil, err
		}

		t.Set(eventInStreamKey(stream, currentStreamPosition), row)
	}

	// Update the head position.
	t.Set(headKey, positionAsByteArray(currentStreamPosition))

	return &AppendResult{
		StreamPosition: currentStreamPosition,
	}, nil
}
