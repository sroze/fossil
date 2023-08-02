package segmentplacement

import (
	"fmt"
	"github.com/google/uuid"
	"github.com/sroze/fossil/store/eskit"
	"reflect"
)

type SegmentNodes []SegmentNode

type SegmentNode struct {
	Node Segment
	Next SegmentNodes
}

type Topology struct {
	aggregate *eskit.Aggregate[TopologyState]

	TopologyReader
	TopologyManager
}

// The topology is basically a graph of segments. The sum of all ranges of all leads must cover the entire store range.
type TopologyState struct {
	Tree SegmentNodes
}

type SegmentSplitEvent struct {
	SplitSegmentId uuid.UUID
	Into           []Segment
}

func Evolve(state TopologyState, event interface{}) TopologyState {
	switch event.(type) {
	case SegmentSplitEvent:
		splitEvent := event.(SegmentSplitEvent)
		state.Tree = state.Tree.WalkAndModify(
			func(node SegmentNode) (bool, SegmentNode) {
				if node.Node.Id == splitEvent.SplitSegmentId {
					node.Next = SegmentNodes{
						{
							Node: splitEvent.Into[0],
						},
						{
							Node: splitEvent.Into[1],
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

var initialState = TopologyState{
	Tree: SegmentNodes([]SegmentNode{{
		Node: Segment{
			Id: uuid.Nil,
			StreamRange: HashSplitRange{
				Prefix:            "",
				PartitionCount:    1,
				AssignedPartition: 0,
			},
		},
	}}),
}

func NewTopology() *Topology {
	return NewTopologyFromEvents([]interface{}{})
}

func NewTopologyFromEvents(events []interface{}) *Topology {
	return &Topology{
		aggregate: eskit.NewAggregateFromEvents(
			initialState,
			Evolve,
			events,
		),
	}
}

func (t *Topology) GetSegmentToWriteInto(stream string) (Segment, error) {
	leaf, found := t.aggregate.State.Tree.Find(func(node SegmentNode) bool {
		return node.Node.StreamRange.Contains(stream) && len(node.Next) == 0
	})

	if !found {
		return Segment{}, fmt.Errorf("no leaf found for stream %s", stream)
	}

	return leaf.Node, nil
}

func (t *Topology) GetSegmentsToReadFrom(streamPrefix string) (SegmentNodes, error) {
	return t.aggregate.State.Tree.Filter(
		func(node SegmentNode) bool {
			return node.Node.StreamRange.Contains(streamPrefix)
		},
	), nil
}

func (t *Topology) SplitSegment(segment Segment, into []Segment) error {
	err := t.aggregate.Apply(SegmentSplitEvent{
		SplitSegmentId: segment.Id,
		Into:           into,
	}, t.aggregate.Position)

	return err
}

func (t *Topology) MergeSegments(segments []Segment, into Segment) error {
	return nil
}
