package topology

import (
	"github.com/heimdalr/dag"
	"github.com/stretchr/testify/assert"
	"golang.org/x/exp/maps"
	"strings"
	"testing"
)

// The graph looks like this:
//
//	  a --> aa --> aaa
//		\-> ab --> aba
//	  b --> ba -/
func dummyDagShapedWithReplacementsOneSplitAndOneMerge() *dag.DAG {
	d := dag.NewDAG()

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

	return d
}

func Test_FilterForwardDag(t *testing.T) {
	t.Run("filters out vertices", func(t *testing.T) {
		d := dummyDagShapedWithReplacementsOneSplitAndOneMerge()

		// Filter only with `aba` prefixed with ID
		filtered := FilterForwardDag(d, func(v dag.IDInterface) FilterResult {
			if strings.HasPrefix("aba", v.ID()) {
				return IncludeAndContinueWalking
			}

			return ExcludeAndStopWalking
		})

		// Expected:
		// a --> ab --> aba
		assert.Equal(t, maps.Keys(filtered.GetRoots()), []string{"a"})
		descendants, err := filtered.GetOrderedDescendants("a")
		assert.Nil(t, err)
		assert.Equal(t, descendants, []string{"ab", "aba"})
	})
}

func Test_FilterBackwardDag(t *testing.T) {
	t.Run("it filters out vertices and include relevant ones", func(t *testing.T) {

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
