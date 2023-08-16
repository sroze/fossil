package topology

import (
	"context"
	"fmt"
	"github.com/heimdalr/dag"
	"github.com/sroze/fossil/eskit"
	"github.com/sroze/fossil/eskit/codec"
	"github.com/sroze/fossil/livetail"
	"github.com/sroze/fossil/store/segments"
)

type Manager struct {
	topologySubscription *eskit.LiveProjection[GraphState]
	tail                 *livetail.LiveTail
	stream               string
	writer               eskit.Writer
}

func NewManager(tail *livetail.LiveTail, codec codec.Codec, writer eskit.Writer, stream string) *Manager {
	return &Manager{
		tail:   tail,
		stream: stream,
		writer: writer,
		topologySubscription: eskit.NewLiveProjection(
			tail,
			codec,
			initialGraphState(),
			EvolveGraphState,
		),
	}
}

func (m *Manager) Create(s segments.Segment) (*segments.Segment, error) {
	position := m.topologySubscription.GetPosition()

	// TODO: validates that no other root can contain the same range.
	// 		 (we might need to implement a `Overlaps()` method on the ranges)

	r, err := m.writer.Write([]eskit.EventToWrite{
		{
			Stream: m.stream,
			Event: SegmentCreatedEvent{
				Segment: s,
			},
			ExpectedPosition: &position,
		},
	})

	if err != nil {
		return nil, err
	}

	// wait for the livetail to be caught up.
	m.topologySubscription.WaitForPosition(
		context.Background(),
		r[0].Position,
	)

	return &s, nil
}

func (m *Manager) Split(segmentId string, chunkCount int) ([]segments.Segment, error) {
	position := m.topologySubscription.GetPosition()

	segment := m.topologySubscription.GetState().GetSegmentById(segmentId)
	if segment == nil {
		return nil, fmt.Errorf("segment %s not found", segmentId)
	}

	splitSegmentParts := segment.Split(chunkCount)
	r, err := m.writer.Write([]eskit.EventToWrite{
		{
			Stream: m.stream,
			Event: SegmentSplitEvent{
				SegmentId: segment.Id,
				Into:      splitSegmentParts,
			},
			ExpectedPosition: &position,
		},
	})

	if err != nil {
		return nil, err
	}

	// wait for the livetail to be caught up.
	m.topologySubscription.WaitForPosition(
		context.Background(),
		r[0].Position,
	)

	return splitSegmentParts, nil
}

func (m *Manager) Start() error {
	m.topologySubscription.Start()

	return nil
}

func (m *Manager) WaitReady() {
	m.topologySubscription.WaitEndOfStream()
}

func (m *Manager) Stop() {
	m.topologySubscription.Stop()
}

func (m *Manager) GetSegmentToWriteInto(stream string) (segments.Segment, error) {
	return m.topologySubscription.GetState().GetSegmentToWriteInto(stream)
}

func (m *Manager) GetSegmentsToReadFrom(streamPrefix string) (*dag.DAG, error) {
	return m.topologySubscription.GetState().GetSegmentsToReadFrom(streamPrefix)
}
