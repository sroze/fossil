package topology

import "github.com/heimdalr/dag"

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
