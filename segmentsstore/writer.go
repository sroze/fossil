package segmentsstore

import (
	"github.com/sroze/fossil/streamstore"
)

func segmentStream(segmentId string) string {
	return "segments/" + segmentId
}

func (w *SegmentStore) Write(commands []streamstore.AppendToStream) ([]streamstore.AppendResult, error) {
	writeCommands := make([]streamstore.AppendToStream, len(commands))
	copy(writeCommands, commands)

	for _, command := range commands {
		segment, err := w.locator.GetSegmentToWriteInto(command.Stream)
		if err != nil {
			return nil, err
		}

		// TODO: lock on this segment.
		// TODO: lookup the current position of the segment in the stream if not in cache.
		segmentPosition, ok := w.segmentCursor[segment.Id]
		if !ok {
			w.segmentCursor[segment.Id] = -1
			segmentPosition = -1
		}

		w.segmentCursor[segment.Id]++

		events := make([]streamstore.Event, len(command.Events))
		for i := 0; i < len(command.Events); i++ {
			events[i] = AddStreamToMetadata(command.Events[i], command.Stream)
		}

		writeCommands = append(writeCommands, streamstore.AppendToStream{
			Stream: segmentStream(segment.ID()),
			Events: events,
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
