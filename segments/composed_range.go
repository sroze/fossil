package segments

type ComposedRange struct {
	StreamRanges []StreamRange
}

func NewComposedRange(ranges ...StreamRange) ComposedRange {
	return ComposedRange{
		StreamRanges: ranges,
	}
}

func (r ComposedRange) Contains(streamOrPrefix string) bool {
	for _, sr := range r.StreamRanges {
		if !sr.Contains(streamOrPrefix) {
			return false
		}
	}

	return true
}
