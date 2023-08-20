package simplestore

import (
	"bytes"
	"fmt"
	"github.com/sroze/fossil/kv"
)

// Challenge: increase writer throughput.
// Assumption: most concurrent writes are to different streams.
// We need to allow preparation of KV writes (incl. encoding, stream positioning, etc...) without the segment position
// Then we need to be able to "get a segment position and lock"
// Transform these "prepared statements" into real statements (with the positioning), and execute them.

func (ss *SimpleStore) PrepareKvWrites(commands []AppendToStream) ([]PreparedWrite, []AppendResult, error) {
	// TODO: cache
	lastKnownStreamPositions := make(map[string]int64)
	streamPositionCursors := make(map[string]int64)

	results := make([]AppendResult, len(commands))
	var writes []PreparedWrite
	for i, command := range commands {

		// TODO: with a condition, do we really need to fetch the stream position? Can we do without?
		// If expected to be empty, we DEFINITELY don't need.
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

			writes = append(writes, []PreparedWrite{
				{
					Key:   SegmentPositionPlaceholderMagicBytes,
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

func (ss *SimpleStore) TransformWritesAndAcquirePositionLock(prepared []PreparedWrite) ([]kv.Write, func(), error) {
	ss.positionMutex.Lock()

	// TODO: cache!
	segmentPosition, err := ss.fetchSegmentPosition()
	if err != nil {
		return nil, func() {}, fmt.Errorf("failed to get segment position: %w", err)
	}

	var writes []kv.Write
	for _, preparedWrite := range prepared {
		if bytes.Equal(preparedWrite.Key, SegmentPositionPlaceholderMagicBytes) {
			segmentPosition++
			preparedWrite.Key = ss.positionIndexedKeyFactory.Bytes(segmentPosition)
		}

		writes = append(writes, kv.Write{
			Key:       preparedWrite.Key,
			Value:     preparedWrite.Value,
			Condition: preparedWrite.Condition,
		})
	}

	// TODO: increment cached segment position

	// TODO: we want to add a timeout here, so that if the client routine crashes,
	//       we don't keep the lock forever.
	return writes, ss.positionMutex.Unlock, nil
}

type PreparedWrite struct {
	// The key will be concatenated, with the magic keys being replaced.
	// The only magic byte buffer currently known is {0x00, 0x01} which means "segment position"
	Key       []byte
	Value     []byte
	Condition *kv.Condition
}

var SegmentPositionPlaceholderMagicBytes = []byte{0x00, 0x01}
