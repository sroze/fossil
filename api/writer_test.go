package api

import "testing"

func Test_writer(t *testing.T) {
	t.Skip("it increments stream position by default")

	t.Run("expects the write stream position", func(t *testing.T) {
		t.Skip("succeed")
		t.Skip("fails")
	})

	t.Skip("one of two concurrent writes fails")

	t.Run("expects a stream to not exist", func(t *testing.T) {
		t.Skip("fails")
		t.Skip("succeed")
	})

	t.Skip("it conflicts when expecting another version number")
}
