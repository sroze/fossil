package topology

import (
	"github.com/heimdalr/dag"
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

// FlowThroughDag walks the DAG in order from the roots to the leaves (in parallel when possible), calling the callback
// for each vertex. It stops walking if the callback returns an error.
func FlowThroughDag(d *dag.DAG, callback func(v dag.IDInterface) error) error {
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
