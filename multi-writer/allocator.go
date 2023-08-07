package multi_writer

import (
	"fmt"
	"github.com/google/uuid"
	"github.com/sroze/fossil/eskit"
	presence2 "github.com/sroze/fossil/presence"
	"github.com/sroze/fossil/segments"
	"github.com/sroze/fossil/streamstore"
	"github.com/sroze/fossil/topology"
	"golang.org/x/exp/maps"
)

type AllocatorState struct {
	segmentsWithoutNode map[uuid.UUID]segments.Segment
	availableNodes      map[uuid.UUID]presence2.Node
}

type Allocator struct {
	subscription eskit.Subscription
	state        *eskit.Projection[AllocatorState]
	rw           *eskit.ReaderWriter
	stream       string
}

var initialAllocatorState = AllocatorState{
	segmentsWithoutNode: map[uuid.UUID]segments.Segment{},
	availableNodes:      map[uuid.UUID]presence2.Node{},
}

func NewAllocator(
	ss streamstore.Store,
	stream string,
) *Allocator {
	a := Allocator{
		stream: stream,
		rw: eskit.NewReaderWriter(
			ss,
			RootCodec,
		),
	}
	a.state = eskit.NewProjection[AllocatorState](
		initialAllocatorState,
		a.evolve,
	)

	a.subscription = eskit.NewSubscription(
		a.rw,
		stream,
		a.act,
	)

	return &a
}

func (a *Allocator) act(item eskit.ReadItem) error {
	if item.Error != nil {
		// TODO: can we remove the need for this?
		return item.Error
	}

	if item.EventInStream != nil {
		err := a.state.Apply(item.EventInStream.Event, item.EventInStream.Position)
		if err != nil {
			return err
		}
	}

	if item.EndOfStreamSignal != nil {
		state := a.state.GetState()
		if len(state.segmentsWithoutNode) == 0 {
			return nil
		}

		if len(state.availableNodes) == 0 {
			// TODO: make the error retryable
			return fmt.Errorf("no available nodes")
		}

		for _, segment := range state.segmentsWithoutNode {
			// TODO: pick a random node, instead.
			node := state.availableNodes[maps.Keys(state.availableNodes)[0]]

			_, err := a.rw.Write([]eskit.EventToWrite{
				{Stream: a.stream, Event: topology.SegmentAllocatedEvent{
					SegmentId: segment.Id,
					NodeId:    node.Id,
				}, ExpectedPosition: &item.EndOfStreamSignal.StreamPosition},
			})

			if err != nil {
				return err
			}
		}
	}

	return nil
}

func (a *Allocator) evolve(state AllocatorState, event interface{}) AllocatorState {
	switch e := event.(type) {
	case *topology.SegmentCreatedEvent:
		state.segmentsWithoutNode[e.Segment.Id] = e.Segment
	case *topology.SegmentAllocatedEvent:
		delete(state.segmentsWithoutNode, e.SegmentId)
	case *presence2.NodeJoinedEvent:
		state.availableNodes[e.Node.Id] = e.Node
	case *presence2.NodeLeftEvent:
		delete(state.availableNodes, e.Node.Id)
	}

	return state
}

func (a *Allocator) Start() error {
	return a.subscription.Start()
}

func (a *Allocator) Stop() {
	a.subscription.Stop()
}
