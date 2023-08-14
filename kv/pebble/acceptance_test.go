package pebble

import (
	"github.com/cockroachdb/pebble"
	kvTesting "github.com/sroze/fossil/kv/testing"
	"github.com/stretchr/testify/assert"
	"testing"
)

// This test defines a list of operations we expect the `kv` implementations to
// support; it is used to test these implementations.
func Test_KV(t *testing.T) {
	db, err := pebble.Open(".pebble", &pebble.Options{})
	assert.Nil(t, err)
	s := NewStore(db)

	kvTesting.RunAcceptanceTest(t, s)
}
