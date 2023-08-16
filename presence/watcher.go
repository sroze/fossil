package presence

import (
	"github.com/google/uuid"
	"github.com/sroze/fossil/eskit"
	"github.com/sroze/fossil/eskit/codec"
	"github.com/sroze/fossil/livetail"
	"github.com/sroze/fossil/simplestore"
)

type WatcherState struct {
	availableNodes map[uuid.UUID]Node
}

type Watcher struct {
	rw         *eskit.ReaderWriter
	projection *eskit.LiveProjection[WatcherState]
	presence   NodePresence
	stream     string
}

func initialPresenceWatcherState() WatcherState {
	return WatcherState{
		availableNodes: map[uuid.UUID]Node{},
	}
}

func NewWatcher(
	ss simplestore.Store,
	stream string,
	presence NodePresence,
) *Watcher {
	c := codec.NewGobCodec(
		NodeLeftEvent{},
		NodeJoinedEvent{},
	)

	pw := Watcher{
		presence: presence,
		stream:   stream,
		rw: eskit.NewReaderWriter(
			ss,
			c,
		),
	}

	pw.projection = eskit.NewLiveProjection[WatcherState](
		livetail.NewLiveTail(
			livetail.NewStreamReader(ss, stream),
		),
		c,
		initialPresenceWatcherState(),
		pw.evolve,
	)

	return &pw
}

func (pw *Watcher) evolve(state WatcherState, event interface{}) WatcherState {
	switch e := event.(type) {
	case *NodeJoinedEvent:
		state.availableNodes[e.Node.Id] = e.Node
	case *NodeLeftEvent:
		delete(state.availableNodes, e.Node.Id)
	}

	return state
}

func (pw *Watcher) compareAndDispatchPresence() error {
	// TODO: lock on state.

	position := pw.projection.GetPosition()
	previouslyAvailableNodes := pw.projection.GetState().availableNodes
	currentlyAvailableNodes := pw.presence.Available()

	var eventsToWrite []eskit.EventToWrite
	for _, node := range previouslyAvailableNodes {
		if _, ok := currentlyAvailableNodes[node.Id]; !ok {
			p := position
			eventsToWrite = append(eventsToWrite, eskit.EventToWrite{
				Stream: pw.stream,
				Event: NodeLeftEvent{
					Node: node,
				},
				ExpectedPosition: &p,
			})

			position++
		}
	}

	for _, node := range currentlyAvailableNodes {
		if _, ok := previouslyAvailableNodes[node.Id]; !ok {
			p := position
			eventsToWrite = append(eventsToWrite, eskit.EventToWrite{
				Stream: pw.stream,
				Event: NodeJoinedEvent{
					Node: node,
				},
				ExpectedPosition: &p,
			})

			position++
		}
	}

	_, err := pw.rw.Write(eventsToWrite)

	return err
}

func (pw *Watcher) Start() error {
	pw.projection.Start()

	return pw.compareAndDispatchPresence()
}

func (pw *Watcher) Stop() {
	pw.projection.Stop()
}
