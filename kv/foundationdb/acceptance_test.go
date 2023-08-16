package foundationdb

import (
	"github.com/apple/foundationdb/bindings/go/src/fdb"
	kvTesting "github.com/sroze/fossil/kv/testing"
	"testing"
)

func Test_FoundationDBStore(t *testing.T) {
	fdb.MustAPIVersion(720)
	s := NewStore(fdb.MustOpenDatabase("../../fdb.cluster"))

	kvTesting.RunAcceptanceTest(t, s)
}
