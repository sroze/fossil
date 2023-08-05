package multi_writer

import (
	"github.com/google/uuid"
	v1 "github.com/sroze/fossil/store/api/v1"
	"github.com/sroze/fossil/store/eskit"
	"github.com/sroze/fossil/store/multi-writer/segments"
	streamstore2 "github.com/sroze/fossil/store/streamstore"
)

//type WriterState struct {
//	currentNodeId        uuid.UUID
//	activeSegmentsOnNode map[uuid.UUID]struct{}
//}
//
//func EvolveWriterState(state WriterState, event interface{}) WriterState {
//	switch e := event.(type) {
//	case *segments.SegmentAllocatedEvent:
//		if e.NodeId == state.currentNodeId {
//			state.activeSegmentsOnNode[e.SegmentId] = struct{}{}
//		}
//	}
//
//	return state
//}

type Writer struct {
	rw      *eskit.ReaderWriter
	ss      streamstore2.Store
	locator segments.SegmentLocator
	// projection *eskit.SubscribedProjection[WriterState]

	segmentCursor map[uuid.UUID]uint64
}

func segmentStream(segment segments.Segment) string {
	return "segments/" + segment.Id.String()
}

func NewWriter(
	ss streamstore2.Store,
	//stream string,
	locator segments.SegmentLocator,
	// currentNodeId uuid.UUID,
) *Writer {
	w := Writer{
		ss:      ss,
		locator: locator,
		rw: eskit.NewReaderWriter(
			ss,
			rootCodec,
		),
		segmentCursor: map[uuid.UUID]uint64{},
	}

	//w.projection = eskit.NewSubscribedProjection[WriterState](
	//	w.rw,
	//	stream,
	//	WriterState{
	//		currentNodeId:        currentNodeId,
	//		activeSegmentsOnNode: map[uuid.UUID]struct{}{},
	//	},
	//	EvolveWriterState,
	//)

	return &w
}

func (w *Writer) Write(request *v1.AppendRequest) (*v1.AppendReply, error) {
	segment, err := w.locator.GetSegmentToWriteInto(request.StreamName)
	if err != nil {
		return nil, err
	}

	// TODO: do we _really_ need to refuse this? Instead, couldn't we _try_
	// 		 by fetching the segment's stream "head" and getting this position?
	//s := w.projection.GetState()
	//_, ok := s.activeSegmentsOnNode[segment.Id]
	//if !ok {
	//	return nil, fmt.Errorf("segment %s is not active on this node", segment.Id)
	//}

	// TODO: lock on this segment.
	segmentPosition, ok := w.segmentCursor[segment.Id]
	if !ok {
		w.segmentCursor[segment.Id] = 0
	}

	w.segmentCursor[segment.Id]++

	appends := []streamstore2.AppendToStream{
		{
			Stream:           request.StreamName,
			ExpectedPosition: request.ExpectedPosition,
			Events: []streamstore2.Event{
				{
					EventId:   request.EventId,
					EventType: request.EventType,
					Payload:   request.Payload,
				},
			},
		},
		{
			Stream: segmentStream(segment),
			// TODO: when write fails because of a conflict on this specific key,
			//       we need to refetch the head position from the stream and retry.
			ExpectedPosition: &segmentPosition,
			Events: []streamstore2.Event{
				{
					EventId: request.EventId,
					// note: we might want to store the position in the stream here instead of copying its content.
					EventType: request.EventId,
					Payload:   request.Payload,
				},
			},
		},
	}

	result, err := w.ss.Write(appends)
	if err != nil {
		return nil, err
	}

	return &v1.AppendReply{
		StreamPosition: result[0].Position,
	}, nil
}
