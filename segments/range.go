package segments

// Defines a range of stream names.
type StreamRange interface {
	Contains(streamOrPrefix string) bool
}
