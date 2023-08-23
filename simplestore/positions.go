package simplestore

import (
	"fmt"
	"github.com/sroze/fossil/kv"
)

func (ss *SimpleStore) getIncrementedSegmentPosition() (int64, error) {
	if ss.positionCache == nil {
		position, err := ss.fetchSegmentPosition()
		if err != nil {
			return 0, err
		}

		ss.positionCache = &position
	}

	*ss.positionCache++
	return *ss.positionCache, nil
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

	// If found is a "normal" event at the end, it must be a system event (like close)
	// that we need to care about.
	decoded, err := DecodeEvent(kp.Value)
	if err != nil {
		eventInStream, eisErr := DecodeEventInStream(kp.Value)
		if eisErr != nil {
			return position, fmt.Errorf("unable to decode head event: %w", err)
		}

		decoded = &eventInStream.Event
		err = nil
	}

	if decoded.EventType == CloseEventType {
		return position, StoreIsClosedErr{}
	}

	return position, err
}
