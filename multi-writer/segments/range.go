package segments

import (
	"hash/fnv"
	"strings"
)

// Defines a range of stream names.
type StreamRange interface {
	Contains(streamOrPrefix string) bool
}

// HashSplitRange splits a stream range into a number of partitions, based on a hash of the stream name.
type HashSplitRange struct {
	Prefix            string
	AssignedPartition int
	PartitionCount    int
}

func NewHashSplitRanges(prefix string, partitionCount int) []HashSplitRange {
	ranges := make([]HashSplitRange, partitionCount)

	for i := 0; i < partitionCount; i++ {
		ranges[i] = HashSplitRange{
			Prefix:            prefix,
			AssignedPartition: i,
			PartitionCount:    partitionCount,
		}
	}

	return ranges
}

func (r HashSplitRange) Contains(streamOrPrefix string) bool {
	if !strings.HasPrefix(streamOrPrefix, r.Prefix) {
		return false
	}

	if streamOrPrefix == r.Prefix {
		return true
	}

	character := streamOrPrefix[len(r.Prefix):][0]

	return int(hash(string(character)))%r.PartitionCount == r.AssignedPartition
}

func hash(s string) uint32 {
	h := fnv.New32a()
	h.Write([]byte(s))
	return h.Sum32()
}
