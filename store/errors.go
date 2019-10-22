package store

// Errors
type DuplicateEventError struct{}

func (e *DuplicateEventError) Error() string {
	return "event with such identifier already exists."
}
