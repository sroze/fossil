package codec

import (
	"github.com/stretchr/testify/assert"
	"testing"
)

type testStruct struct {
	A string
}

func Test_GobCodec(t *testing.T) {
	t.Run("ser/des a simple structure", func(t *testing.T) {
		c := NewGobCodec(testStruct{})
		toBeSerDes := testStruct{A: "test"}

		serialized, err := c.Serialize(toBeSerDes)
		assert.Nil(t, err)

		deserialized, err := c.Deserialize(serialized)
		assert.Nil(t, err)

		asOriginalType, ok := deserialized.(*testStruct)
		assert.True(t, ok)
		assert.Equal(t, toBeSerDes.A, asOriginalType.A)
	})
}
