package kv

type ErrConditionalWriteFails struct {
	// The condition that failed.
	Condition *Condition

	// Key that failed the condition.
	Key []byte

	// (If applicable) the value that was found.
	FoundValue []byte
}

func (e ErrConditionalWriteFails) Error() string {
	return "conditional write fails"
}
