package topology

import (
	"context"
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

// The graph looks like this:
//
//	a --> aa --> aaa
func dummyDagShapedWithReplacements() *dag.DAG {
	d := dag.NewDAG()

	addVertexOrPanic(d, newTestVertex("a"))
	addVertexOrPanic(d, newTestVertex("aa"))
	addVertexOrPanic(d, newTestVertex("aaa"))
	addEdgeOrPanic(d, "a", "aa")
	addEdgeOrPanic(d, "aa", "aaa")

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

func Test_WalkBackwardsDag(t *testing.T) {
	t.Run("it walks in backward order through parents", func(t *testing.T) {
		d := dummyDagShapedWithReplacements()
		var visited []string

		err := WalkBackwardsDag(context.Background(), d, func(v dag.IDInterface) error {
			visited = append(visited, v.ID())
			return nil
		})
		assert.Nil(t, err)
		assert.Equal(t, []string{"aaa", "aa", "a"}, visited)
	})

	t.Run("it can be cancelled through the context", func(t *testing.T) {
		var visited []string

		ctx, cancel := context.WithCancel(context.Background())
		err := WalkBackwardsDag(ctx, dummyDagShapedWithReplacements(), func(v dag.IDInterface) error {
			visited = append(visited, v.ID())

			if v.ID() == "aa" {
				cancel()
			}
			return nil
		})

		assert.Nil(t, err)
		assert.Equal(t, []string{"aaa", "aa"}, visited)
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
