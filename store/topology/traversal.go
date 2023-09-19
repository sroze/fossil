package topology

import (
	"context"
	"fmt"
	"github.com/heimdalr/dag"
	"golang.org/x/exp/maps"
)

type FilterResult int

const (
	// Primitives
	include         = 0b01
	continueWalking = 0b10

	// Public combinations
	IncludeAndContinueWalking FilterResult = include | continueWalking
	IncludeButStopWalking                  = include
	ExcludeAndStopWalking                  = 0b00
)

// FilterForwardDag returns a new DAG with only the vertices that match the filter.
// It walks the graph "forward", meaning from the roots to the leads. If a vertex is excluded, its children will not
// be walked through either.
// If the `filter` returns `true` for a vertex, it will be included in the destination graph and its children
// will be walked through.
func FilterForwardDag(d *dag.DAG, filter func(v dag.IDInterface) FilterResult) *dag.DAG {
	filtered := dag.NewDAG()

	for _, v := range d.GetRoots() {
		result := filter(v.(dag.IDInterface))
		if result&include == include {
			addVertexOrPanic(filtered, v.(dag.IDInterface))
		}
		if result&continueWalking == continueWalking {
			walkChildrenAndFilter(d, filtered, v.(dag.IDInterface), filter)
		}
	}

	return filtered
}

func FilterBackwardDag(d *dag.DAG, filter func(v dag.IDInterface) FilterResult) *dag.DAG {
	filtered := dag.NewDAG()

	for _, v := range d.GetLeaves() {
		walkParentsAndFilter(d, filtered, v.(dag.IDInterface), nil, filter)
	}

	return filtered
}

// WalkForwardDag walks the DAG in order from the roots to the leaves (in parallel when possible), calling the callback
// for each vertex. It stops walking if the callback returns an error.
func WalkForwardDag(d *dag.DAG, callback func(v dag.IDInterface) error) error {
	flowCallback := func(d *dag.DAG, id string, parentResults []dag.FlowResult) (interface{}, error) {
		v, err := d.GetVertex(id)
		if err != nil {
			return nil, err
		}

		err = callback(v.(dag.IDInterface))
		return nil, err
	}

	roots := d.GetRoots()
	results := make(chan error, len(roots))
	for _, v := range roots {
		go func(id string) {
			// This is a workaround for a bug in `dag.DescendantsFlow` when the DAG has only one root.
			// @see https://github.com/heimdalr/dag/pull/27/files
			descendants, err := d.GetDescendants(id)
			if len(descendants) == 0 {
				_, err := flowCallback(d, id, nil)
				results <- err
				return
			}

			_, err = d.DescendantsFlow(id, nil, flowCallback)
			results <- err
		}(v.(dag.IDInterface).ID())
	}

	for i := 0; i < len(roots); i++ {
		err := <-results
		if err != nil {
			return err
		}
	}

	return nil
}

// WalkBackwardsDag walks the DAG in order from the leaves to the roots.
// It stops walking if the callback returns an error.
// The current implementation does not parallelize the walk and does not support
// multiple leaves, through it is expected to be possible and a possible future improvement.
func WalkBackwardsDag(ctx context.Context, d *dag.DAG, callback func(v dag.IDInterface) error) error {
	leaves := d.GetLeaves()
	if len(leaves) > 1 {
		return fmt.Errorf("multiple leaves are not supported yet, found %d", len(leaves))
	} else if len(leaves) == 0 {
		// dag is empty, return early
		return nil
	}

	leafId := maps.Keys(leaves)
	visited := make(map[string]bool)

	return walkParents(ctx, d, leaves[leafId[0]].(dag.IDInterface), callback, visited)
}

func walkParents(ctx context.Context, d *dag.DAG, v dag.IDInterface, callback func(v dag.IDInterface) error, visited map[string]bool) error {
	if visited[v.ID()] {
		return nil
	}

	visited[v.ID()] = true

	err := callback(v)
	if err != nil {
		return err
	}

	select {
	case <-ctx.Done():
		return nil
	default:
	}

	parents, err := d.GetParents(v.ID())
	if err != nil {
		return err
	} else if len(parents) > 1 {
		return fmt.Errorf("multiple parents are not supported yet, found %d", len(parents))
	}

	for _, parent := range parents {
		err = walkParents(ctx, d, parent.(dag.IDInterface), callback, visited)
		if err != nil {
			return err
		}

		select {
		case <-ctx.Done():
			return nil
		default:
			continue
		}
	}

	return nil
}

func walkChildrenAndFilter(source *dag.DAG, target *dag.DAG, v dag.IDInterface, filter func(v dag.IDInterface) FilterResult) {
	result := filter(v)
	if result&include != include {
		return
	}

	children, err := source.GetChildren(v.ID())
	if err != nil {
		panic(err)
	}

	for _, child := range children {
		child := child.(dag.IDInterface)
		childFilterResult := filter(child)

		if childFilterResult&include == include {
			addVertexOrPanic(target, child)
			addEdgeOrPanic(target, v.ID(), child.ID())
		}

		if childFilterResult&continueWalking == continueWalking {
			walkChildrenAndFilter(source, target, child, filter)
		}
	}
}

func walkParentsAndFilter(source *dag.DAG, target *dag.DAG, v dag.IDInterface, leaf dag.IDInterface, filter func(v dag.IDInterface) FilterResult) {
	vertexWasAlreadyInTarget, _ := target.GetVertex(v.ID())

	result := filter(v.(dag.IDInterface))
	if result&include == include {
		addVertexOrPanic(target, v.(dag.IDInterface))

		if leaf != nil {
			addEdgeOrPanic(target, v.ID(), leaf.ID())
		}
	}

	// If `v` already exists in the target, we can stop here, we came to this
	// vertex through another leaf.
	if vertexWasAlreadyInTarget != nil {
		return
	}

	if result&continueWalking != continueWalking {
		return
	}

	parents, err := source.GetParents(v.ID())
	if err != nil {
		panic(err)
	}

	for _, parent := range parents {
		parent := parent.(dag.IDInterface)
		walkParentsAndFilter(source, target, parent, v, filter)
	}
}
