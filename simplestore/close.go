package simplestore

import (
	"fmt"
	"github.com/google/uuid"
	"github.com/sroze/fossil/kv"
)

var CloseEventType = "$close"

func (ss SimpleStore) PrepareCloseKvWrites() ([]kv.Write, error) {
	segmentPosition, err := ss.fetchSegmentPosition()
	if err != nil {
		return nil, fmt.Errorf("failed to get segment position: %w", err)
	}

	value, err := EncodeEvent(Event{
		EventId:   uuid.NewString(),
		EventType: CloseEventType,
		Payload:   nil,
		Metadata:  nil,
	})
	if err != nil {
		return nil, fmt.Errorf("unable to encode close event: %w", err)
	}

	return []kv.Write{
		{
			Key:   ss.positionIndexedKeyFactory.Bytes(segmentPosition + 1),
			Value: value,
			Condition: &kv.Condition{
				MustBeEmpty: true,
			},
		},
	}, nil
}
