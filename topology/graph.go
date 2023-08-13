package topology

import (
	"fmt"
	"github.com/heimdalr/dag"
	"github.com/sroze/fossil/segments"
	"reflect"
)

type GraphState struct {
	// `dag` is a directed acyclic graph (DAG) implementation.
	d *dag.DAG

	// `dag` is not designed to be used with structs, but with simple values. Concretely,
	// it hashes the Vertex objects (@see https://github.com/heimdalr/dag/blob/bcb933ff9e3571f9d8bdd2008e7949bae08e4063/dag.go#L86C1-L88)
	// which means they can't contain slices or maps. Instead, we them provide simple IDs (strings) and
	// use the following map to retrieve the actual segment.
	segments map[string]segments.Segment
}

func initialGraphState() GraphState {
	return GraphState{
		d:        dag.NewDAG(),
		segments: make(map[string]segments.Segment),
	}
}

func EvolveGraphState(state GraphState, event interface{}) GraphState {
	switch e := event.(type) {
	case *SegmentCreatedEvent:
		state.segments[e.Segment.ID()] = e.Segment
		addVertexOrPanic(state.d, segmentInDag{
			Id: e.Segment.ID(),
		})
	case *SegmentSplitEvent:
		for _, s := range e.Into {
			state.segments[s.ID()] = s

			addVertexOrPanic(state.d, segmentInDag{Id: s.ID()})
			addEdgeOrPanic(state.d, e.SegmentId.String(), s.ID())
		}
	case *SegmentReplacedEvent:
		state.segments[e.ReplacedBy.ID()] = e.ReplacedBy

		addVertexOrPanic(state.d, segmentInDag{Id: e.ReplacedBy.ID()})
		addEdgeOrPanic(state.d, e.SegmentId.String(), e.ReplacedBy.ID())
	default:
		panic(fmt.Errorf("unknown event type %s", reflect.TypeOf(event)))
	}

	return state
}

func (g GraphState) GetSegmentToWriteInto(stream string) (segments.Segment, error) {
	leaves := g.d.GetLeaves()
	for _, l := range leaves {
		segment := g.segments[l.(segmentInDag).Id]
		if segment.StreamRange.ContainsStream(stream) {
			return segment, nil
		}
	}

	return segments.Segment{}, fmt.Errorf("no segment to write into")
}

func (g GraphState) GetSegmentsToReadFrom(streamPrefix string) (*dag.DAG, error) {
	return FilterForwardDag(g.d, func(v dag.IDInterface) FilterResult {
		segment := g.segments[v.(segmentInDag).Id]

		if segment.StreamRange.ContainsStreamPrefixedWith(streamPrefix) {
			return IncludeAndContinueWalking
		}

		return ExcludeAndStopWalking
	}), nil
}

func (g GraphState) GetSegmentById(segmentId string) *segments.Segment {
	segment, ok := g.segments[segmentId]
	if !ok {
		return nil
	}

	return &segment
}

func addVertexOrPanic(d *dag.DAG, v dag.IDInterface) {
	_, err := d.AddVertex(v)
	if err != nil {
		_, isDuplicate := err.(dag.VertexDuplicateError)
		if isDuplicate {
			return
		}

		panic(err)
	}
}

func addEdgeOrPanic(d *dag.DAG, from string, to string) {
	err := d.AddEdge(from, to)
	if err != nil {
		panic(err)
	}
}

type segmentInDag struct {
	Id string
}

func (s segmentInDag) ID() string {
	return s.Id
}
