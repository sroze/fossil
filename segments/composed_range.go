package segments

type ComposedRange struct {
	StreamRanges []StreamRange
}

func NewComposedRange(ranges ...StreamRange) ComposedRange {
	return ComposedRange{
		StreamRanges: ranges,
	}
}

func (r ComposedRange) ContainsStream(stream string) bool {
	for _, sr := range r.StreamRanges {
		if !sr.ContainsStream(stream) {
			return false
		}
	}

	return true
}

func (r ComposedRange) ContainsStreamPrefixedWith(prefix string) bool {
	for _, sr := range r.StreamRanges {
		if !sr.ContainsStreamPrefixedWith(prefix) {
			return false
		}
	}

	return true
}
