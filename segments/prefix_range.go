package segments

import "strings"

type PrefixRange struct {
	StreamRange

	Prefix string
}

func NewPrefixRange(prefix string) PrefixRange {
	return PrefixRange{
		Prefix: prefix,
	}
}

func (r PrefixRange) Contains(streamOrPrefix string) bool {
	return strings.HasPrefix(streamOrPrefix, r.Prefix)
}
