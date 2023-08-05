package segments

import (
	"github.com/stretchr/testify/assert"
	"testing"
)

func Test_HashSplitRange(t *testing.T) {
	t.Run("the range is consistent with the sub-keys", func(t *testing.T) {
		partitionOne := HashSplitRange{Prefix: "foo/", AssignedPartition: 0, PartitionCount: 2}
		partitionTwo := HashSplitRange{Prefix: "foo/", AssignedPartition: 1, PartitionCount: 2}

		assert.True(t, partitionOne.Contains("foo/"))
		assert.True(t, partitionOne.Contains("foo/abc"))
		assert.True(t, partitionOne.Contains("foo/abc/def"))
		assert.True(t, partitionOne.Contains("foo/abc/zeo"))
		assert.False(t, partitionOne.Contains("bar/"))
		assert.False(t, partitionOne.Contains("foo/239"))

		assert.True(t, partitionTwo.Contains("foo/"))
		assert.True(t, partitionTwo.Contains("foo/239"))
		assert.True(t, partitionTwo.Contains("foo/239/foo"))
		assert.True(t, partitionTwo.Contains("foo/239/bar"))
		assert.False(t, partitionTwo.Contains("bar/"))
		assert.False(t, partitionTwo.Contains("foo/abc"))
	})
}
