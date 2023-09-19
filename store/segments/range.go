package segments

type StreamRange interface {
	// ContainsStream should return true if the stream name is contained within the range.
	ContainsStream(stream string) bool

	// ContainsStreamPrefixedWith should return true if the range will contain streams that have the provided prefix.
	ContainsStreamPrefixedWith(prefix string) bool
}
