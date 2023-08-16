package store

import (
	"github.com/google/uuid"
	"github.com/sroze/fossil/kv"
	"github.com/sroze/fossil/simplestore"
)

func segmentStream(segmentId string) string {
	return "segments/" + segmentId
}

func (w *Store) Write(commands []simplestore.AppendToStream) ([]simplestore.AppendResult, error) {
	commandsBySegment := make(map[uuid.UUID][]simplestore.AppendToStream)

	// TODO: deal with each command concurrently
	for _, command := range commands {
		// TODO: cache
		segment, err := w.locator.GetSegmentToWriteInto(command.Stream)
		if err != nil {
			return nil, err
		}

		commandsBySegment[segment.Id] = append(commandsBySegment[segment.Id], command)
	}

	var writes []kv.Write
	// FIXME: NEED TO be the same order as the commands!
	var results []simplestore.AppendResult
	for segmentId, commands := range commandsBySegment {
		segmentWrites, segmentResults, err := w.storeForSegment(segmentId).PrepareKvWrites(commands)
		if err != nil {
			return nil, err
		}

		writes = append(writes, segmentWrites...)
		segmentResults = append(segmentResults, segmentResults...)
	}

	err := w.kv.Write(writes)
	if err != nil {
		return nil, err
	}

	return results, nil
}

func (w *Store) storeForSegment(segmentId uuid.UUID) *simplestore.SimpleStore {
	w.segmentStoresMutex.Lock()
	defer w.segmentStoresMutex.Unlock()

	_, exists := w.segmentStores[segmentId]
	if !exists {
		w.segmentStores[segmentId] = simplestore.NewStore(
			w.kv,
			segmentId.String(),
		)
	}

	return w.segmentStores[segmentId]
}
