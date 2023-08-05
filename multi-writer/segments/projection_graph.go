package segments

import (
	"fmt"
	"github.com/sroze/fossil/eskit"
	"reflect"
)

type SegmentNode struct {
	Node Segment
	Next SegmentNodes
}

// TODO: rename to be `Topology` (or similar) which is a (proper) DAG structure
type ProjectionGraph struct {
	aggregate *eskit.Projection[GraphState]

	SegmentLocator
}

// The topology is basically a graph of segments. The sum of all ranges of all leads must cover the entire store range.
type GraphState struct {
	Tree SegmentNodes
}

var initialState = GraphState{
	Tree: []SegmentNode{},
}

func Evolve(state GraphState, event interface{}) GraphState {
	switch e := event.(type) {
	case SegmentCreatedEvent:
		state.Tree = []SegmentNode{{
			Node: e.Segment,
		}}
	case SegmentSplitEvent:
		state.Tree = state.Tree.WalkAndModify(
			func(node SegmentNode) (bool, SegmentNode) {
				if node.Node.Id == e.SplitSegmentId {
					node.Next = SegmentNodes{
						{
							Node: e.Into[0],
						},
						{
							Node: e.Into[1],
						},
					}
				}

				return true, node
			},
		)
	default:
		panic(fmt.Errorf("unknown event type %s", reflect.TypeOf(event)))
	}

	return state
}

func NewGraphProjection() *ProjectionGraph {
	return NewGraphProjectionWithEvents([]interface{}{})
}

func NewGraphProjectionWithEvents(events []interface{}) *ProjectionGraph {
	return &ProjectionGraph{
		aggregate: eskit.NewProjectionFromEvents(
			initialState,
			Evolve,
			events,
		),
	}
}

func (t *ProjectionGraph) GetSegmentToWriteInto(stream string) (Segment, error) {
	leaf, found := t.aggregate.GetState().Tree.Find(func(node SegmentNode) bool {
		return node.Node.StreamRange.Contains(stream) && len(node.Next) == 0
	})

	if !found {
		return Segment{}, fmt.Errorf("no leaf found for stream %s", stream)
	}

	return leaf.Node, nil
}

func (t *ProjectionGraph) GetSegmentsToReadFrom(streamPrefix string) (SegmentNodes, error) {
	return t.aggregate.GetState().Tree.Filter(
		func(node SegmentNode) bool {
			return node.Node.StreamRange.Contains(streamPrefix)
		},
	), nil
}
