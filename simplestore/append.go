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

func (ss *SimpleStore) Write(commands []AppendToStream) ([]AppendResult, error) {
	preparedWrites, results, err := ss.PrepareKvWrites(commands)
	if err != nil {
		return results, err
	}

	writes, unlock, err := ss.TransformWritesAndAcquirePositionLock(preparedWrites)
	defer unlock()
	if err != nil {
		return results, err
	}
	
	return results, ss.kv.Write(writes)
}

func (ss *SimpleStore) fetchStreamPosition(stream string) (int64, error) {
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

func (ss *SimpleStore) fetchSegmentPosition() (int64, error) {
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
