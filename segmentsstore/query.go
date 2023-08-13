package segmentsstore

import (
	"context"
	"fmt"
	"github.com/google/uuid"
	"github.com/heimdalr/dag"
	"github.com/sroze/fossil/streamstore"
	"github.com/sroze/fossil/topology"
)

// TODO: implement batching?
func (w *SegmentStore) Query(ctx context.Context, prefix string, positionCursor PositionCursor, ch chan QueryItem) {
	segmentsRelevantToPrefix, err := w.locator.GetSegmentsToReadFrom(prefix)
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
				// I have no idea why, but directly sending `event.eventInStore` to the channel causes
				// the first event to be dropped (and only the first one) 🤯
				EventInStream: &EventInStore{
					Stream: event.eventInStore.Stream,
					Event:  event.eventInStore.Event,
				},
				Position: (*PositionCursor)(&cursorAsString),
			}
		}
	}(ch, startingPosition.Clone())

	err = topology.FlowThroughDag(
		segmentsToRead,
		func(segment dag.IDInterface) error {
			return w.readSegment(ctx, segment, startingPosition, prefix, eventAggregator)
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
	eventInStore    EventInStore
}

func (w *SegmentStore) readSegment(ctx context.Context, segment dag.IDInterface, startingPosition *topology.Position, prefix string, ch chan EventInSegment) error {
	segmentId := uuid.MustParse(segment.ID())
	segmentCh := make(chan streamstore.ReadItem)
	go w.ss.Read(
		ctx,
		segmentStream(segmentId.String()),
		startingPosition.PositionInSegment(uuid.MustParse(segment.ID())),
		segmentCh,
	)

	cnt := 0
	for item := range segmentCh {
		cnt++
		if item.Error != nil {
			return item.Error
		}

		if item.EventInStream != nil {
			stream, err := GetStreamFromMetadata(item.EventInStream.Event)
			if err != nil {
				return err
			}

			if stream[:len(prefix)] != prefix {
				continue
			}

			ch <- EventInSegment{
				segmentId:       segmentId,
				segmentPosition: item.EventInStream.Position,
				eventInStore: EventInStore{
					Event:  item.EventInStream.Event,
					Stream: stream,
				},
			}
		}

		if item.EndOfStreamSignal != nil {
			// TODO: this would mean it's the end of the segment.
			// 		 (when subscribing, we'll have to differentiate between closed and open ones)
		}
	}

	return nil
}
