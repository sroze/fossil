package topology

import (
	"context"
	"fmt"
	"github.com/heimdalr/dag"
	"github.com/sroze/fossil/eskit"
	"github.com/sroze/fossil/eskit/codec"
	"github.com/sroze/fossil/kv"
	"github.com/sroze/fossil/livetail"
	"github.com/sroze/fossil/simplestore"
	"github.com/sroze/fossil/store/pool"
	"github.com/sroze/fossil/store/segments"
)

type Manager struct {
	topologySubscription *eskit.LiveProjection[GraphState]
	tail                 *livetail.LiveTail
	stream               string
	pool                 *pool.SimpleStorePool
	ss                   *simplestore.SimpleStore
	codec                codec.Codec
	kv                   kv.KV
}

func NewManager(
	ss *simplestore.SimpleStore,
	stream string,
	codec codec.Codec,
	pool *pool.SimpleStorePool,
	kv kv.KV,
) *Manager {
	tail := livetail.NewLiveTail(livetail.NewStreamReader(ss, stream))

	return &Manager{
		kv:     kv,
		tail:   tail,
		stream: stream,
		ss:     ss,
		codec:  codec,
		topologySubscription: eskit.NewLiveProjection(
			tail,
			codec,
			initialGraphState(),
			EvolveGraphState,
		),
		pool: pool,
	}
}

func (m *Manager) Create(s segments.Segment) (*segments.Segment, error) {
	position := m.topologySubscription.GetPosition()

	// TODO: validates that no other root can contain the same range.
	// 		 (we might need to implement a `Overlaps()` method on the ranges)

	event, err := m.codec.Serialize(SegmentCreatedEvent{
		Segment: s,
	})
	if err != nil {
		return nil, err
	}

	r, err := m.ss.Write(context.Background(), []simplestore.AppendToStream{{
		Stream:    m.stream,
		Events:    []simplestore.Event{event},
		Condition: &simplestore.AppendCondition{WriteAtPosition: position + 1},
	}})
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

	previousSegmentsStore := m.pool.GetStoreForSegment(segment.Id)
	closeWrites, err := previousSegmentsStore.PrepareCloseKvWrites(context.Background())
	if err != nil {
		return nil, fmt.Errorf("could not prepare writes to close the store: %w", err)
	}

	event, err := m.codec.Serialize(SegmentSplitEvent{
		SegmentId: segment.Id,
		Into:      splitSegmentParts,
	})
	if err != nil {
		return nil, err
	}

	topologyWrites, topologyResults, err := m.ss.PrepareKvWrites(context.Background(), []simplestore.AppendToStream{{
		Stream:    m.stream,
		Events:    []simplestore.Event{event},
		Condition: &simplestore.AppendCondition{WriteAtPosition: position + 1},
	}})
	if err != nil {
		return nil, err
	}

	kvWrites, unlock, err := m.ss.TransformWritesAndAcquirePositionLock(context.Background(), topologyWrites)
	defer unlock()
	if err != nil {
		return nil, err
	}

	err = m.kv.Write(append(closeWrites, kvWrites...))
	if err != nil {
		return nil, err
	}

	// wait for the livetail to be caught up.
	m.topologySubscription.WaitForPosition(
		context.Background(),
		topologyResults[0].Position,
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

func (m *Manager) GetSegmentsToReadFromPrefix(streamPrefix string) (*dag.DAG, error) {
	return m.topologySubscription.GetState().GetSegmentsToReadFromPrefix(streamPrefix)
}

func (m *Manager) GetSegmentsToReadFromStream(stream string) (*dag.DAG, error) {
	return m.topologySubscription.GetState().GetSegmentsToReadFromStream(stream)
}
