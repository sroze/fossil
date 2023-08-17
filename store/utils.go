package store

import (
	"fmt"
	"github.com/sroze/fossil/simplestore"
)

func mergeCommandsPerStream(commands []simplestore.AppendToStream) ([]simplestore.AppendToStream, error) {
	commandsByStream := make(map[string][]simplestore.AppendToStream)
	for _, command := range commands {
		commandsByStream[command.Stream] = append(commandsByStream[command.Stream], command)
	}

	merged := make([]simplestore.AppendToStream, 0)
	for _, streamCommands := range commandsByStream {
		m, err := mergeCommands(streamCommands)
		if err != nil {
			return nil, err
		}

		merged = append(merged, m)
	}

	return merged, nil
}

func mergeCommands(commands []simplestore.AppendToStream) (simplestore.AppendToStream, error) {
	command := simplestore.AppendToStream{}
	for _, c := range commands {
		if command.Stream == "" {
			command.Stream = c.Stream
		} else if command.Stream != c.Stream {
			return simplestore.AppendToStream{}, fmt.Errorf("cannot merge commands for different streams")
		}

		if command.Condition == nil {
			command.Condition = c.Condition
		} else if c.Condition != nil && command.Condition != nil {
			if c.Condition.WriteAtPosition != command.Condition.WriteAtPosition {
				return simplestore.AppendToStream{}, fmt.Errorf("cannot merge commands with different conditions")
			}
		}

		command.Events = append(command.Events, c.Events...)
	}

	return command, nil
}
