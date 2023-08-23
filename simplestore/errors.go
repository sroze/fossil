package simplestore

import (
	"errors"
	"fmt"
	"github.com/sroze/fossil/kv"
)

var MaxRetries = 5

type StoreIsClosedErr struct {
}

func (e StoreIsClosedErr) Error() string {
	return "store is closed"
}

type StreamConditionFailed struct {
	Stream                 string
	ExpectedStreamPosition int64
}

func (e StreamConditionFailed) Error() string {
	return fmt.Sprintf("failed expectation to find stream %s at position #%d", e.Stream, e.ExpectedStreamPosition)
}

var SegmentConcurrentWriteErr = errors.New("concurrent write on segment")

func (ss *SimpleStore) HandleError(err error) (bool, error) {
	conditionFailed, isConditionFailed := err.(kv.ErrConditionalWriteFails)

	// If the error is not a conditional write failure, we don't know what to do.
	if !isConditionFailed {
		return false, err
	}

	if stream, position, err := ss.streamIndexedKeyFactory.Reverse(conditionFailed.Key); err == nil {
		// A stream has been written in the meantime.
		return true, StreamConditionFailed{
			Stream:                 stream,
			ExpectedStreamPosition: position,
		}
	}

	if _, err := ss.positionIndexedKeyFactory.Reverse(conditionFailed.Key); err == nil {
		// This means that something else has been written in this segment in the meantime. This might be
		// competing writers (which is expected while the topology is changing).
		return true, SegmentConcurrentWriteErr
	}

	return false, err
}
