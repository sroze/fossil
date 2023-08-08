package segments

import (
	"golang.org/x/exp/rand"
	"hash/fnv"
)

// HashSplitRange splits a stream range into a number of partitions, based on a hash of the stream name.
type HashSplitRange struct {
	AssignedPartition int
	PartitionCount    int
	Seed              []byte
}

func NewHashSplitRangesWithSeed(partitionCount int, seed []byte) []HashSplitRange {
	ranges := make([]HashSplitRange, partitionCount)

	for i := 0; i < partitionCount; i++ {
		ranges[i] = HashSplitRange{
			AssignedPartition: i,
			PartitionCount:    partitionCount,
			Seed:              seed,
		}
	}

	return ranges
}

func NewHashSplitRanges(partitionCount int) []HashSplitRange {
	return NewHashSplitRangesWithSeed(partitionCount, generateSeed())
}

func (r HashSplitRange) ContainsStream(stream string) bool {
	return int(r.hash(stream))%r.PartitionCount == r.AssignedPartition
}

func (r HashSplitRange) ContainsStreamPrefixedWith(prefix string) bool {
	// We currently hash on the entirety of the `stream` name to have even distribution
	// between partitions. This means that we can't use the prefix to determine if the
	// range contains the prefix.
	return true
}

func (r HashSplitRange) hash(s string) uint32 {
	toHash := append([]byte{}, r.Seed...)
	toHash = append(toHash, []byte(s)...)

	h := fnv.New32a()
	h.Write(toHash)
	return h.Sum32()
}

func generateSeed() []byte {
	buf := make([]byte, 8)
	rand.Read(buf)

	return buf
}
