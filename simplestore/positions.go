package simplestore

import (
	"context"
	"fmt"
	"github.com/sroze/fossil/kv"
)

func (ss *SimpleStore) getIncrementedSegmentPosition(ctx context.Context) (int64, error) {
	if ss.positionCache == nil {
		position, err := ss.fetchSegmentPosition(ctx)
		if err != nil {
			return 0, err
		}

		ss.positionCache = &position
	}

	*ss.positionCache++
	return *ss.positionCache, nil
}

func (ss *SimpleStore) fetchStreamPosition(ctx context.Context, stream string) (int64, error) {
	kf := StreamIndexEventKeyFactory{keySpace: ss.keySpace}
	kpChan := make(chan kv.KeyPair, 1)
	err := ss.kv.Scan(
		ctx,
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

func (ss *SimpleStore) fetchSegmentPosition(ctx context.Context) (int64, error) {
	kpChan := make(chan kv.KeyPair, 1)
	err := ss.kv.Scan(
		ctx,
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
