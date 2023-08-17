package store

import (
	"context"
	"fmt"
	"github.com/google/uuid"
	"github.com/sroze/fossil/kv"
	"github.com/sroze/fossil/simplestore"
)

func (s *Store) Write(commands []simplestore.AppendToStream) ([]simplestore.AppendResult, error) {
	commandsBySegment := make(map[uuid.UUID]map[int]simplestore.AppendToStream)

	// TODO: deal with each command concurrently
	for commandIndex, command := range commands {
		// TODO: cache
		segment, err := s.locator.GetSegmentToWriteInto(command.Stream)
		if err != nil {
			return nil, err
		}

		if _, exists := commandsBySegment[segment.Id]; !exists {
			commandsBySegment[segment.Id] = make(map[int]simplestore.AppendToStream)
		}

		commandsBySegment[segment.Id][commandIndex] = command
	}

	var writes []kv.Write
	results := make([]simplestore.AppendResult, len(commands))
	for segmentId, segmentCommands := range commandsBySegment {
		var commands []simplestore.AppendToStream
		var indexes []int
		for index, command := range segmentCommands {
			commands = append(commands, command)
			indexes = append(indexes, index)
		}

		segmentWrites, segmentResults, err := s.prepareWritesForSegment(segmentId, commands)
		if err != nil {
			return nil, err
		}

		writes = append(writes, segmentWrites...)
		for i, index := range indexes {
			results[index] = segmentResults[i]
		}
	}

	err := s.kv.Write(writes)
	if err != nil {
		keys := make([][]byte, len(writes))
		for i, write := range writes {
			keys[i] = write.Key
		}

		for i, key := range keys {
			duplicate := false
			for j, otherKey := range keys {
				if i != j && string(key) == string(otherKey) {
					duplicate = true
					break
				}
			}

			fmt.Printf("%s -- dup: %t\n", string(key), duplicate)
		}

		return nil, err
	}

	return results, nil
}

func (s *Store) prepareWritesForSegment(segmentId uuid.UUID, commands []simplestore.AppendToStream) ([]kv.Write, []simplestore.AppendResult, error) {
	commandsByStream := make(map[string][]simplestore.AppendToStream)
	for _, command := range commands {
		commandsByStream[command.Stream] = append(commandsByStream[command.Stream], command)
	}

	var preparedCommands []simplestore.AppendToStream
	for stream, streamCommands := range commandsByStream {
		if len(streamCommands) > 1 {
			return nil, nil, fmt.Errorf("cannot have multiple commands for the same stream in the same write: use a single command with multiple events")
		}

		streamPosition, err := s.fetchStreamPosition(stream)
		if err != nil {
			return nil, nil, err
		}

		cmd := streamCommands[0]
		if streamPosition == -1 {
			// The stream does not exist yet.
			if cmd.Condition == nil {
				cmd.Condition = &simplestore.AppendCondition{
					StreamIsEmpty: true,
				}
			} else if cmd.Condition.WriteAtPosition > 0 {
				return nil, nil, fmt.Errorf("expected to write at position %d but stream is empty", cmd.Condition.WriteAtPosition)
			}
		} else {
			// The stream exists.
			if cmd.Condition == nil {
				// We add the condition, so that regardless of the target segment's situation,
				// the position is correct across them all.
				cmd.Condition = &simplestore.AppendCondition{
					WriteAtPosition: streamPosition + 1,
				}
			} else if cmd.Condition.StreamIsEmpty {
				return nil, nil, fmt.Errorf("expected stream %s to be empty", cmd.Stream)
			} else if cmd.Condition.WriteAtPosition > 0 && cmd.Condition.WriteAtPosition != (streamPosition+1) {
				return nil, nil, fmt.Errorf("expected to write at position %d but got %d", cmd.Condition.WriteAtPosition, streamPosition+1)
			}
		}

		preparedCommands = append(preparedCommands, cmd)
	}

	return s.storeForSegment(segmentId).PrepareKvWrites(preparedCommands)
}

func (s *Store) fetchStreamPosition(stream string) (int64, error) {
	ch := make(chan simplestore.ReadItem)
	go s.Read(context.Background(), stream, ch, simplestore.ReadOptions{
		Backwards: true,
		Limit:     1,
	})

	streamHead, streamHeadExists := <-ch
	if !streamHeadExists {
		return -1, nil
	}

	if streamHead.Error != nil {
		return -1, streamHead.Error
	}

	return streamHead.EventInStream.Position, nil
}

func (s *Store) storeForSegment(segmentId uuid.UUID) *simplestore.SimpleStore {
	s.segmentStoresMutex.Lock()
	defer s.segmentStoresMutex.Unlock()

	_, exists := s.segmentStores[segmentId]
	if !exists {
		s.segmentStores[segmentId] = simplestore.NewStore(
			s.kv,
			segmentId.String(),
		)
	}

	return s.segmentStores[segmentId]
}
