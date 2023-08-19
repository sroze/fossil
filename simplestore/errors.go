package simplestore

import (
	"context"
	"github.com/sroze/fossil/kv"
)

var MaxRetries = 5

type StoreIsClosedErr struct {
}

func (e StoreIsClosedErr) Error() string {
	return "store is closed"
}

// shouldRetry returns true if the error is transient and the operation should be retried.
func (ss SimpleStore) shouldRetry(ctx context.Context, err error) bool {
	conditionFailed, isConditionFailed := err.(kv.ErrConditionalWriteFails)

	// If the error is not a conditional write failure, we don't know what to do and as such
	// should not retry.
	if !isConditionFailed {
		return false
	}

	if _, err := ss.positionIndexedKeyFactory.Reverse(conditionFailed.Key); err == nil {
		// This means that something else has been written in this segment in the meantime. This might be
		// competing writers (which is expected while the topology is changing). As such, we
		// should retry if we didn't exhaust the retry budget.
		// TODO: error budget, with the `ctx`
		return true
	} else if _, _, err := ss.streamIndexedKeyFactory.Reverse(conditionFailed.Key); err == nil {
		// A stream has been written in the meantime. Given the current implementation, this
		// means that another writer has written in the stream too, because we currently fetch
		// the position in the application before writing again.
		return true
	}

	// We don't know what to do with this error, so we don't retry.
	return false
}
