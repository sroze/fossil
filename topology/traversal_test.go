package topology

import (
	"github.com/heimdalr/dag"
	"github.com/stretchr/testify/assert"
	"golang.org/x/exp/maps"
	"strings"
	"testing"
)

func Test_FilterDag(t *testing.T) {
	t.Run("filters out vertices", func(t *testing.T) {
		d := dag.NewDAG()

		// a --> aa --> aaa
		//   \-> ab --> aba
		// b --> ba -/
		addVertexOrPanic(d, newTestVertex("a"))
		addVertexOrPanic(d, newTestVertex("aa"))
		addVertexOrPanic(d, newTestVertex("aaa"))
		addVertexOrPanic(d, newTestVertex("ab"))
		addVertexOrPanic(d, newTestVertex("aba"))
		addVertexOrPanic(d, newTestVertex("b"))
		addVertexOrPanic(d, newTestVertex("ba"))
		addEdgeOrPanic(d, "a", "aa")
		addEdgeOrPanic(d, "aa", "aaa")
		addEdgeOrPanic(d, "a", "ab")
		addEdgeOrPanic(d, "ab", "aba")
		addEdgeOrPanic(d, "b", "ba")
		addEdgeOrPanic(d, "ba", "aba")

		// Filter only with `aba` prefixed with ID
		filtered := FilterDag(d, func(v dag.IDInterface) bool {
			return strings.HasPrefix("aba", v.ID())
		})

		// Expected:
		// a --> ab --> aba
		assert.Equal(t, maps.Keys(filtered.GetRoots()), []string{"a"})
		descendants, err := filtered.GetOrderedDescendants("a")
		assert.Nil(t, err)
		assert.Equal(t, descendants, []string{"ab", "aba"})
	})
}

type testVertex struct {
	id string
}

func newTestVertex(id string) *testVertex {
	return &testVertex{id}
}

func (v testVertex) ID() string {
	return v.id
}
