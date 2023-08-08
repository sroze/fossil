package topology

import (
	"github.com/heimdalr/dag"
)

func FilterDag(d *dag.DAG, filter func(v dag.IDInterface) bool) *dag.DAG {
	filtered := dag.NewDAG()

	for _, v := range d.GetRoots() {
		if !filter(v.(dag.IDInterface)) {
			continue
		}

		addVertexOrPanic(filtered, v.(dag.IDInterface))
		walkChildrenAndFilter(d, filtered, v.(dag.IDInterface), filter)
	}

	return filtered
}

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
			_, err := d.DescendantsFlow(id, nil, flowCallback)
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

func walkChildrenAndFilter(source *dag.DAG, target *dag.DAG, v dag.IDInterface, filter func(v dag.IDInterface) bool) {
	if !filter(v) {
		return
	}

	children, err := source.GetChildren(v.ID())
	if err != nil {
		panic(err)
	}

	for _, child := range children {
		child := child.(dag.IDInterface)

		if filter(child) {
			addVertexOrPanic(target, child)
			addEdgeOrPanic(target, v.ID(), child.ID())
			walkChildrenAndFilter(source, target, child, filter)
		}
	}
}
