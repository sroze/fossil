package index

import (
	"fmt"
	"github.com/google/uuid"
	"github.com/sroze/fossil/store/eskit"
	"github.com/sroze/fossil/store/eskit/codec"
	"github.com/sroze/fossil/store/streamstore"
	"reflect"
	"strings"
)

// The IndexManager is responsible for managing indexes.
// TODO: rename to controller?
// TODO: split between "controller" and "locator"?
type IndexManager struct {
	ss    streamstore.Store
	actor *eskit.Actor[ManagerState]
}

type ManagerState struct {
	indexes []Index
}

func Evolve(state ManagerState, event interface{}) ManagerState {
	switch event.(type) {
	case *IndexCreated:
		state.indexes = append(state.indexes, Index{
			Id:           event.(*IndexCreated).Id,
			StreamPrefix: event.(*IndexCreated).Prefix,
			// Later, this will only be `WRITING` if we decide to backfill indexes.
			Status: READY,
		})
	default:
		panic(fmt.Errorf("unknown event type %s", reflect.TypeOf(event)))
	}

	return state
}

// NewManager creates a new SegmentsManager.
func NewManager(
	ss streamstore.Store,
	stream string,
) *IndexManager {
	return &IndexManager{
		ss: ss,
		actor: eskit.NewActor(
			ss,
			codec.NewProtobufCodec([]codec.ProtobufTypePair{
				{"IndexCreated", &IndexCreated{}},
				{"IndexReady", &IndexReady{}},
			}),
			stream,
			ManagerState{},
			Evolve,
		),
	}
}

func (m *IndexManager) Start() error {
	err := m.actor.Start()
	if err != nil {
		return err
	}

	m.actor.WaitReady()
	return nil
}

func (m *IndexManager) Stop() {
	m.actor.Stop()
}

func (m *IndexManager) CreateIndex(streamPrefix string) error {
	position := m.actor.GetPosition()

	// TODO: check if the index already exists?

	id := uuid.NewString()
	result, err := m.actor.Write([]interface{}([]IndexCreated{{
		Id:     id,
		Prefix: streamPrefix,
	}}), position)
	if err != nil {
		return err
	}

	// Wait for the actor to be ready.
	m.actor.WaitForPosition(result.StreamPosition)

	return nil
}

func (m *IndexManager) GetIndexesToWriteInto(streamName string) []Index {
	var indexes []Index
	for _, index := range m.actor.GetState().indexes {
		if strings.HasPrefix(streamName, index.StreamPrefix) {
			indexes = append(indexes, index)
		}
	}

	return indexes
}

func (m *IndexManager) GetIndexesToReadFrom(streamPrefix string) []Index {
	var indexes []Index
	for _, index := range m.actor.GetState().indexes {
		if index.Status == READY && strings.HasPrefix(streamPrefix, index.StreamPrefix) {
			indexes = append(indexes, index)
		}
	}

	return indexes
}
