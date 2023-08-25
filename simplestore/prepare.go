package simplestore

import (
	"bytes"
	"context"
	"fmt"
	"github.com/sroze/fossil/kv"
)

// Challenge: increase writer throughput.
// Assumption: most concurrent writes are to different streams.
// We need to allow preparation of KV writes (incl. encoding, stream positioning, etc...) without the segment position
// Then we need to be able to "get a segment position and lock"
// Transform these "prepared statements" into real statements (with the positioning), and execute them.

func (ss *SimpleStore) PrepareKvWrites(ctx context.Context, commands []AppendToStream) ([]PreparedWrite, []AppendResult, error) {
	// TODO: cache (https://github.com/coocood/freecache)
	streamPositionCursors := make(map[string]int64)

	results := make([]AppendResult, len(commands))
	var writes []PreparedWrite
	for i, command := range commands {
		if command.Condition != nil {
			if command.Condition.WriteAtPosition < 0 {
				return nil, nil, fmt.Errorf("expected write position to be positive, got %d", command.Condition.WriteAtPosition)
			}

			if command.Condition.WriteAtPosition >= 0 {
				streamPositionCursors[command.Stream] = command.Condition.WriteAtPosition - 1
			} else if command.Condition.StreamIsEmpty {
				streamPositionCursors[command.Stream] = -1
			} else {
				return nil, nil, fmt.Errorf("expected write position or stream empty condition to be set")
			}
		} else if _, exists := streamPositionCursors[command.Stream]; !exists {
			fetchedPosition, err := ss.fetchStreamPosition(ctx, command.Stream)
			if err != nil {
				return nil, nil, err
			}

			streamPositionCursors[command.Stream] = fetchedPosition
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

// TODO: add a pipeline here to allow for concurrent writes within the single segment while keeping
// TODO: the same architecture (i.e. one Fossil -> KV store roundtrip at a time)
// TODO: cancel the lock if context is cancelled.
func (ss *SimpleStore) TransformWritesAndAcquirePositionLock(ctx context.Context, prepared []PreparedWrite) ([]kv.Write, func(), error) {
	ss.positionMutex.Lock()

	var writes []kv.Write
	for _, preparedWrite := range prepared {
		if bytes.Equal(preparedWrite.Key, SegmentPositionPlaceholderMagicBytes) {
			position, err := ss.getIncrementedSegmentPosition(ctx)
			if err != nil {
				return nil, func() {}, fmt.Errorf("failed to get incremented segment position: %w", err)
			}

			preparedWrite.Key = ss.positionIndexedKeyFactory.Bytes(position)
		}

		writes = append(writes, kv.Write{
			Key:       preparedWrite.Key,
			Value:     preparedWrite.Value,
			Condition: preparedWrite.Condition,
		})
	}

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
