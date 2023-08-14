package testing

import (
	"github.com/google/uuid"
	"github.com/sroze/fossil/kv"
	"github.com/stretchr/testify/assert"
	"testing"
)

// RunAcceptanceTest is a 'reference' test implementation for all the KV implementations.
func RunAcceptanceTest(t *testing.T, s kv.KV) {
	prefix := []byte("tests/" + uuid.NewString() + "/")
	prefixedKey := func(key []byte) []byte {
		concat := make([]byte, len(prefix)+len(key))
		copy(concat, prefix)
		copy(concat[len(prefix):], key)

		return concat
	}

	t.Run("write, get and scan", func(t *testing.T) {
		err := s.Write([]kv.Write{
			{Key: prefixedKey([]byte("s/foo")), Value: []byte("foo")},
			{Key: prefixedKey([]byte("s/bar")), Value: []byte("bar")},
			{Key: prefixedKey([]byte("z/bar")), Value: []byte("bar")},
		})
		assert.Nil(t, err)
		kvs, err := s.Scan(kv.KeyRange{
			Start: prefixedKey([]byte{'s', 0x00}),
			End:   prefixedKey([]byte{'s', 0xFF}),
		}, true, false)
		assert.Nil(t, err)

		assert.Equal(t, []kv.KeyPair{
			{Key: prefixedKey([]byte("s/bar")), Value: []byte("bar")},
			{Key: prefixedKey([]byte("s/foo")), Value: []byte("foo")},
		}, kvs)

		value, err := s.Get(prefixedKey([]byte("z/bar")))
		assert.Nil(t, err)
		assert.Equal(t, []byte("bar"), value)

		value, err = s.Get(prefixedKey([]byte("z/foo")))
		assert.Nil(t, err)
		assert.Nil(t, value)
	})

	t.Run("it handles conditional writes", func(t *testing.T) {
		t.Run("must be empty", func(t *testing.T) {
			err := s.Write([]kv.Write{{
				Key:   prefixedKey([]byte("does-not-exists")),
				Value: []byte("foo"),
				Condition: &kv.Condition{
					MustBeEmpty: true,
				},
			}})

			assert.Nil(t, err)

			err = s.Write([]kv.Write{{
				Key:   prefixedKey([]byte("does-not-exists")),
				Value: []byte("bar"),
				Condition: &kv.Condition{
					MustBeEmpty: true,
				},
			}})
			assert.NotNil(t, err)
		})
	})

	t.Run("catches concurrent writes", func(t *testing.T) {
		results := make(chan error, 2)
		write := func(value []byte) {
			results <- s.Write([]kv.Write{{
				Key:   prefixedKey([]byte("another-key")),
				Value: value,
				Condition: &kv.Condition{
					MustBeEmpty: true,
				},
			}})
		}

		go write([]byte("foo"))
		go write([]byte("bar"))

		err1 := <-results
		err2 := <-results
		if err1 == nil && err2 == nil {
			t.Fatal("expected at least one error")
		} else if err1 != nil && err2 != nil {
			t.Fatal("expected just one error")
		}
	})
}
