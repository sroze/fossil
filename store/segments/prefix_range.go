package segments

import (
	"golang.org/x/exp/constraints"
	"strings"
)

type PrefixRange struct {
	Prefix string
}

func NewPrefixRange(prefix string) PrefixRange {
	return PrefixRange{
		Prefix: prefix,
	}
}

func (r PrefixRange) ContainsStream(stream string) bool {
	return strings.HasPrefix(stream, r.Prefix)
}

func (r PrefixRange) ContainsStreamPrefixedWith(prefix string) bool {
	lengthsToCompare := min(len(prefix), len(r.Prefix))

	return r.Prefix[:lengthsToCompare] == prefix[:lengthsToCompare]
}

func min[T constraints.Ordered](a, b T) T {
	if a < b {
		return a
	}
	return b
}
