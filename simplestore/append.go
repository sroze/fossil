package simplestore

import (
	"fmt"
	"github.com/sroze/fossil/kv"
)

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

func (ss SimpleStore) Write(commands []AppendToStream) ([]AppendResult, error) {
	writes, results, err := ss.PrepareKvWrites(commands)
	if err != nil {
		return results, err
	}

	err = ss.kv.Write(writes)
	return results, err
}

func (ss SimpleStore) PrepareKvWrites(commands []AppendToStream) ([]kv.Write, []AppendResult, error) {
	results := make([]AppendResult, len(commands))

	// TODO: cache + mutex!
	segmentPosition, err := ss.fetchSegmentPosition()
	if err != nil {
		return nil, nil, fmt.Errorf("failed to get segment position: %w", err)
	}

	// TODO: cache + mutex!
	lastKnownStreamPositions := make(map[string]int64)

	streamPositionCursors := make(map[string]int64)

	var writes []kv.Write
	for i, command := range commands {
		_, exists := lastKnownStreamPositions[command.Stream]
		if !exists {
			position, err := ss.fetchStreamPosition(command.Stream)
			if err != nil {
				return nil, nil, err
			}

			lastKnownStreamPositions[command.Stream] = position
			streamPositionCursors[command.Stream] = position
		}

		if command.Condition != nil {
			if command.Condition.WriteAtPosition < 0 {
				return nil, nil, fmt.Errorf("expected write position to be positive, got %d", command.Condition.WriteAtPosition)
			}

			if lastKnownStreamPositions[command.Stream] == -1 {
				// The stream is empty, but the client expects to write at a specific position.
				if command.Condition.WriteAtPosition > 0 {
					streamPositionCursors[command.Stream] = command.Condition.WriteAtPosition - 1
				}
			} else {
				if command.Condition.StreamIsEmpty {
					return nil, nil, ConditionFailed{
						Stream:                 command.Stream,
						ExpectedStreamPosition: -1,
						FoundStreamPosition:    lastKnownStreamPositions[command.Stream],
					}
				} else if command.Condition.WriteAtPosition > 0 && (lastKnownStreamPositions[command.Stream]+1) != command.Condition.WriteAtPosition {
					return nil, nil, ConditionFailed{
						Stream:                 command.Stream,
						ExpectedStreamPosition: command.Condition.WriteAtPosition,
						FoundStreamPosition:    lastKnownStreamPositions[command.Stream],
					}
				}
			}
		}

		for _, event := range command.Events {
			streamPositionCursors[command.Stream]++
			segmentPosition++

			encodedEvent, err := EncodeEvent(event)
			if err != nil {
				return nil, nil, err
			}

			encodedEventInStream, err := EncodeEventInStream(EventInStream{
				Event:    event,
				Stream:   command.Stream,
				Position: streamPositionCursors[command.Stream],
			})
			if err != nil {
				return nil, nil, err
			}

			writes = append(writes, []kv.Write{
				{
					Key:   ss.positionIndexedKeyFactory.Bytes(segmentPosition),
					Value: encodedEventInStream,
					Condition: &kv.Condition{
						MustBeEmpty: true,
					},
				},
				{
					Key: ss.streamIndexedKeyFactory.Bytes(
						command.Stream,
						streamPositionCursors[command.Stream],
					),
					Value: encodedEvent,
					Condition: &kv.Condition{
						MustBeEmpty: true,
					},
				},
			}...)
		}

		results[i] = AppendResult{
			Position: streamPositionCursors[command.Stream],
		}
	}

	return writes, results, nil
}

func (ss SimpleStore) fetchStreamPosition(stream string) (int64, error) {
	kf := StreamIndexEventKeyFactory{keySpace: ss.keySpace}
	kpChan := make(chan kv.KeyPair, 1)
	err := ss.kv.Scan(
		kf.Range(stream),
		kv.ScanOptions{
			Backwards: true,
			Limit:     1,
		},
		kpChan,
	)

	if err != nil {
		return 0, err
	}

	kp, contains := <-kpChan
	if !contains {
		return -1, nil
	}

	_, position, err := kf.Reverse(kp.Key)
	return position, err
}

func (ss SimpleStore) fetchSegmentPosition() (int64, error) {
	kpChan := make(chan kv.KeyPair, 1)
	err := ss.kv.Scan(
		ss.positionIndexedKeyFactory.Range(),
		kv.ScanOptions{
			Backwards: true,
			Limit:     1,
		},
		kpChan,
	)

	if err != nil {
		return 0, err
	}

	kp, contains := <-kpChan
	if !contains {
		return -1, nil
	}

	position, err := ss.positionIndexedKeyFactory.Reverse(kp.Key)

	// FIXME: will `DecodeEvent` even work sometimes?
	decoded, err := DecodeEvent(kp.Value)
	if err != nil {
		test, testErr := DecodeEventInStream(kp.Value)
		if testErr != nil {
			return position, fmt.Errorf("unable to decode head event: %w", err)
		}

		decoded = &test.Event
		err = nil
	}

	if decoded.EventType == CloseEventType {
		return position, StoreIsClosedErr{}
	}

	return position, err
}
