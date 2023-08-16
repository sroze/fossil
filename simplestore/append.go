package simplestore

import (
	"fmt"
	"github.com/sroze/fossil/kv"
)

type AppendResult struct {
	Position int64
}

type AppendToStream struct {
	Stream           string
	Events           []Event
	ExpectedPosition *int64
}

func (ss SimpleStore) Write(commands []AppendToStream) ([]AppendResult, error) {
	writes, results, err := ss.PrepareKvWrites(commands)
	if err != nil {
		return results, err
	}

	err = ss.kv.Write(writes)
	if err != nil {
		if conditionFailed, isConditionFailed := err.(kv.ErrConditionalWriteFails); isConditionFailed {
			// ...

			if p, err := ss.positionIndexedKeyFactory.Reverse(conditionFailed.Key); err == nil {
				// TODO: It means something else has been written in this segment in the meantime, let's retry
				//       the whole command.
				return results, fmt.Errorf("expected empty segment key position #%d found something instead", p)
			} else if s, p, err := ss.streamIndexedKeyFactory.Reverse(conditionFailed.Key); err == nil {
				// TODO: It's either a concurrency issue, or a wrong client expectation. We need to identify
				// 	     which one it is, and act accordingly.
				return results, fmt.Errorf("expected empty position %d for stream %s but found something", p, s)
			}
		}
	}

	return results, err
}

func (ss SimpleStore) PrepareKvWrites(commands []AppendToStream) ([]kv.Write, []AppendResult, error) {
	results := make([]AppendResult, len(commands))

	// TODO: cache + mutex!
	segmentPosition, err := ss.getSegmentPosition()
	if err != nil {
		return nil, nil, fmt.Errorf("failed to get segment position: %w", err)
	}

	// TODO: cache + mutex!
	streamPositions := make(map[string]int64)

	// 1. Generate the write requests with templates.
	var writes []kv.Write
	for i, command := range commands {
		_, exists := streamPositions[command.Stream]
		if !exists {
			position, err := ss.getStreamPosition(command.Stream)
			if err != nil {
				return nil, nil, err
			}

			streamPositions[command.Stream] = position
		}

		if command.ExpectedPosition != nil {
			if streamPositions[command.Stream] != *command.ExpectedPosition {
				return nil, nil, fmt.Errorf("expected stream position %d, but got %d", *command.ExpectedPosition, streamPositions[command.Stream])
			}
		}

		for _, event := range command.Events {
			streamPositions[command.Stream]++
			segmentPosition++

			encodedEvent, err := EncodeEvent(event)
			if err != nil {
				return nil, nil, err
			}

			encodedEventInStream, err := EncodeEventInStream(EventInStream{
				Event:    event,
				Stream:   command.Stream,
				Position: streamPositions[command.Stream],
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
						streamPositions[command.Stream],
					),
					Value: encodedEvent,
					Condition: &kv.Condition{
						MustBeEmpty: true,
					},
				},
			}...)
		}

		results[i] = AppendResult{
			Position: streamPositions[command.Stream],
		}
	}

	return writes, results, nil
}

func (ss SimpleStore) getStreamPosition(stream string) (int64, error) {
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

func (ss SimpleStore) getSegmentPosition() (int64, error) {
	kf := PositionIndexedEventKeyFactory{keySpace: ss.keySpace}
	kpChan := make(chan kv.KeyPair, 1)
	err := ss.kv.Scan(
		kf.Range(),
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

	position, err := kf.Reverse(kp.Key)
	return position, err
}
