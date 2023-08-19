package store

import (
	"context"
	"fmt"
	"github.com/google/uuid"
	"github.com/heimdalr/dag"
	"github.com/sroze/fossil/simplestore"
	"github.com/sroze/fossil/store/topology"
)

// TODO: implement batching?
func (s *Store) Query(ctx context.Context, prefix string, positionCursor PositionCursor, ch chan QueryItem) {
	segmentsRelevantToPrefix, err := s.locator.GetSegmentsToReadFromPrefix(prefix)
	if err != nil {
		ch <- QueryItem{Error: fmt.Errorf("could not get segments to read from: %w", err)}
		return
	}

	startingPosition, err := topology.NewPositionFromSerialized(string(positionCursor))
	if err != nil {
		ch <- QueryItem{Error: fmt.Errorf("could not deserialize position cursor: %w", err)}
		return
	}

	segmentsToRead := startingPosition.TrimForRemaining(segmentsRelevantToPrefix)

	// This 'aggregator' receives events from the segments and sends them to the channel, while
	// keeping track of the position across segments.
	eventAggregator := make(chan EventInSegment)
	go func(target chan QueryItem, cursor *topology.Position) {
		defer close(target)

		for event := range eventAggregator {
			err := cursor.AdvanceTo(segmentsToRead, event.segmentId, event.segmentPosition+1)
			if err != nil {
				target <- QueryItem{Error: fmt.Errorf("unable to advance cursor: %w", err)}
				return
			}

			cursorAsString := cursor.Serialize()
			target <- QueryItem{
				// I have no idea why, but directly sending `event.eventInStream` to the channel causes
				// the first event to be dropped (and only the first one) 🤯
				EventInStream: &simplestore.EventInStream{
					Stream:   event.eventInStream.Stream,
					Event:    event.eventInStream.Event,
					Position: event.eventInStream.Position,
				},
				Position: (*PositionCursor)(&cursorAsString),
			}
		}
	}(ch, startingPosition.Clone())

	err = topology.WalkForwardDag(
		segmentsToRead,
		func(segment dag.IDInterface) error {
			return s.readSegment(ctx, segment, startingPosition, prefix, eventAggregator)
		},
	)

	if err != nil {
		ch <- QueryItem{Error: err}
	}

	close(eventAggregator)
}

type EventInSegment struct {
	segmentId       uuid.UUID
	segmentPosition int64
	eventInStream   simplestore.EventInStream
}

func (s *Store) readSegment(ctx context.Context, segment dag.IDInterface, startingPosition *topology.Position, prefix string, ch chan EventInSegment) error {
	// TODO (perf): remove these unnecessary `MustParse` with better typing traversing DAGs
	segmentId := uuid.MustParse(segment.ID())
	store := s.pool.GetStoreForSegment(segmentId)

	segmentCh := make(chan simplestore.QueryItem)
	go store.Query(ctx, prefix, startingPosition.PositionInSegment(segmentId), segmentCh)

	cnt := 0
	for item := range segmentCh {
		cnt++
		if item.Error != nil {
			return item.Error
		}

		if item.EventInStream != nil {
			ch <- EventInSegment{
				segmentId:       segmentId,
				segmentPosition: item.Position,
				eventInStream: simplestore.EventInStream{
					Event:    item.EventInStream.Event,
					Stream:   item.EventInStream.Stream,
					Position: item.EventInStream.Position,
				},
			}
		}
	}

	return nil
}
