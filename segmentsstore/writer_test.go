package segmentsstore

import (
	"testing"
)

func Test_Writer(t *testing.T) {
	t.Skip("TODO: writer can restart and pick up the last segment's position")
	t.Skip("TODO: 2 concurrent writers will compete for the same segment but work")
	t.Skip("TODO: eventually consistent topology view does not cause out-of-order writes")
	// i.e. when 2 writers process requests concurrently, with different view of the world after a topology change (i.e. split or replace).
}
