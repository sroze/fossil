package store

import (
	"context"
	"errors"
	"fmt"
	"github.com/google/uuid"
	"github.com/sroze/fossil/kv"
	"github.com/sroze/fossil/simplestore"
)

func (s *Store) Write(ctx context.Context, commands []simplestore.AppendToStream) ([]simplestore.AppendResult, error) {
	results, err := s.attemptWrite(ctx, commands)
	if err != nil {
		shouldRetry := false
		if errors.Is(err, simplestore.SegmentConcurrentWriteErr) {
			shouldRetry = true
		}

		_, isStreamConditionFailed := err.(simplestore.StreamConditionFailed)
		if isStreamConditionFailed {
			// TODO: if it was a user-set condition, there's not even a point retrying.
			shouldRetry = true
		}

		if shouldRetry {
			// Given the current implementation, this means that another writer has written in the stream too, because we currently fetch
			// the positions in the application before writing. As such, we should retry, within reasonable limits.
			retryCount := ctx.Value("retryCount")
			if retryCount == nil {
				retryCount = 0
			}

			if retryCount.(int) > 5 {
				return results, fmt.Errorf("failed too many times: %w", err)
			}

			return s.Write(
				context.WithValue(ctx, "retryCount", retryCount.(int)+1),
				commands,
			)
		}
	}

	return results, err
}

func (s *Store) attemptWrite(ctx context.Context, commands []simplestore.AppendToStream) ([]simplestore.AppendResult, error) {
	preparedCommands, err := s.prepareCommands(commands)
	if err != nil {
		return nil, err
	}

	// Group commands by segment
	commandsBySegment := make(map[uuid.UUID]map[int]simplestore.AppendToStream)
	for commandIndex, command := range preparedCommands {
		segment, err := s.topologyManager.GetSegmentToWriteInto(command.Stream)
		if err != nil {
			return nil, err
		}

		if _, exists := commandsBySegment[segment.Id]; !exists {
			commandsBySegment[segment.Id] = make(map[int]simplestore.AppendToStream)
		}

		commandsBySegment[segment.Id][commandIndex] = command
	}

	// Prepare KV kvWrites and append (optimistic) results, in the same order as original commands.
	preparedWritesPerSegment := make(map[uuid.UUID][]simplestore.PreparedWrite)
	results := make([]simplestore.AppendResult, len(commands))
	for segmentId, segmentCommands := range commandsBySegment {
		var commands []simplestore.AppendToStream
		var indexes []int
		for index, command := range segmentCommands {
			commands = append(commands, command)
			indexes = append(indexes, index)
		}

		// Note(perf): we could parallelize this.
		segmentWrites, segmentResults, err := s.pool.GetStoreForSegment(segmentId).PrepareKvWrites(commands)
		if err != nil {
			return nil, err
		}

		preparedWritesPerSegment[segmentId] = segmentWrites
		for i, index := range indexes {
			results[index] = segmentResults[i]
		}
	}

	// Lock and transform each write then send to KV.
	var kvWrites []kv.Write
	for segmentId, segmentWrites := range preparedWritesPerSegment {
		w, unlock, err := s.pool.GetStoreForSegment(segmentId).TransformWritesAndAcquirePositionLock(segmentWrites)
		defer unlock()

		if err != nil {
			return results, err
		}

		kvWrites = append(kvWrites, w...)
	}

	err = s.kv.Write(kvWrites)
	if err != nil {
		for segmentId, _ := range preparedWritesPerSegment {
			handled, transformed := s.pool.GetStoreForSegment(segmentId).HandleError(err)
			if handled {
				err = transformed
				break
			}
		}
	}

	return results, err
}

func (s *Store) prepareCommands(commands []simplestore.AppendToStream) ([]simplestore.AppendToStream, error) {
	// Validates that we don't have multiple commands for the same stream.
	commandsByStream := make(map[string][]simplestore.AppendToStream)
	for _, command := range commands {
		commandsByStream[command.Stream] = append(commandsByStream[command.Stream], command)

		if len(commandsByStream[command.Stream]) > 1 {
			return nil, fmt.Errorf("cannot have multiple commands for the same stream in the same write: use a single command with multiple events")
		}
	}

	// Prepare commands by setting the expected stream position, based on the position across
	// segments.
	preparedCommands := make([]simplestore.AppendToStream, len(commands))
	for i, cmd := range commands {
		streamPosition, err := s.fetchStreamPosition(cmd.Stream)
		if err != nil {
			return nil, err
		}

		if streamPosition == -1 {
			// The stream does not exist yet.
			if cmd.Condition == nil {
				cmd.Condition = &simplestore.AppendCondition{
					StreamIsEmpty: true,
				}
			} else if cmd.Condition.WriteAtPosition > 0 {
				return nil, simplestore.StreamConditionFailed{
					Stream:                 cmd.Stream,
					ExpectedStreamPosition: cmd.Condition.WriteAtPosition,
				}
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
				return nil, simplestore.StreamConditionFailed{
					Stream:                 cmd.Stream,
					ExpectedStreamPosition: -1,
				}
			} else if cmd.Condition.WriteAtPosition > 0 && cmd.Condition.WriteAtPosition != (streamPosition+1) {
				return nil, simplestore.StreamConditionFailed{
					Stream:                 cmd.Stream,
					ExpectedStreamPosition: cmd.Condition.WriteAtPosition - 1,
				}
			}
		}

		preparedCommands[i] = cmd
	}

	return preparedCommands, nil
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
