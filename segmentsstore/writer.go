package segmentsstore

import (
	"github.com/sroze/fossil/segments"
	"github.com/sroze/fossil/streamstore"
)

func segmentStream(segment segments.Segment) string {
	return "segments/" + segment.Id.String()
}

func (w *SegmentStore) Write(commands []streamstore.AppendToStream) ([]streamstore.AppendResult, error) {
	writeCommands := commands

	for _, command := range commands {
		segment, err := w.locator.GetSegmentToWriteInto(command.Stream)
		if err != nil {
			return nil, err
		}

		// TODO: lock on this segment.
		segmentPosition, ok := w.segmentCursor[segment.Id]
		if !ok {
			w.segmentCursor[segment.Id] = 0
		}

		w.segmentCursor[segment.Id]++

		writeCommands = append(writeCommands, streamstore.AppendToStream{
			Stream: segmentStream(segment),
			Events: command.Events,
			// TODO: when write fails because of a conflict on this specific key,
			//       we need to refetch the head position from the stream and retry.
			ExpectedPosition: &segmentPosition,
		})
	}

	result, err := w.ss.Write(writeCommands)
	if err != nil {
		return nil, err
	}

	return result[0:len(commands)], nil
}
