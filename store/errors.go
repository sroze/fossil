package store

// Errors
type DuplicateEventError struct{}

func (e *DuplicateEventError) Error() string {
	return "event with such identifier already exists."
}

// Errors
type SequenceNumberDoNotMatchError struct{}

func (e *SequenceNumberDoNotMatchError) Error() string {
	return "Expected event sequence number does not match."
}
