package eskit

import (
	"context"
	"fmt"
	"github.com/dustin/go-broadcast"
	"github.com/sroze/fossil/simplestore"
	"sync"
)

type InMemoryStore struct {
	byStream map[string][]simplestore.Event
	ordered  []simplestore.EventInStream
	b        broadcast.Broadcaster
	mu       sync.Mutex
}

type appendNotification struct {
	stream   string
	position int64
}

func NewInMemoryStore() *InMemoryStore {
	return &InMemoryStore{
		byStream: map[string][]simplestore.Event{},
		ordered:  []simplestore.EventInStream{},
		b:        broadcast.NewBroadcaster(1),
	}
}

func (s *InMemoryStore) Write(commands []simplestore.AppendToStream) ([]simplestore.AppendResult, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	results := make([]simplestore.AppendResult, len(commands))

	for i, command := range commands {
		if _, ok := s.byStream[command.Stream]; !ok {
			s.byStream[command.Stream] = []simplestore.Event{}
		}

		positionOfFirstEvent := int64(len(s.byStream[command.Stream]) - 1)
		if command.Condition != nil && command.Condition.WriteAtPosition != (positionOfFirstEvent+1) {
			return nil, fmt.Errorf("expected position %d, but got %d", command.Condition.WriteAtPosition, positionOfFirstEvent)
		}

		for _, event := range command.Events {
			s.byStream[command.Stream] = append(s.byStream[command.Stream], event)
			s.ordered = append(s.ordered, simplestore.EventInStream{
				Stream:   command.Stream,
				Position: int64(len(s.byStream[command.Stream])),
				Event:    event,
			})
		}

		results[i] = simplestore.AppendResult{
			Position: positionOfFirstEvent + int64(len(command.Events)),
		}

		s.b.Submit(appendNotification{
			stream:   command.Stream,
			position: results[i].Position,
		})
	}

	return results, nil
}

func (s *InMemoryStore) Read(ctx context.Context, stream string, ch chan simplestore.ReadItem, options simplestore.ReadOptions) {
	defer close(ch)
	s.mu.Lock()

	if len(s.byStream[stream]) < int(options.StartingPosition) {
		s.mu.Unlock()
		return
	}

	eventsToBeSent := s.byStream[stream][options.StartingPosition:]
	s.mu.Unlock()

	for i, event := range eventsToBeSent {
		ch <- simplestore.ReadItem{
			EventInStream: &simplestore.EventInStream{
				Stream:   stream,
				Event:    event,
				Position: options.StartingPosition + int64(i),
			},
		}

		// Check if context is cancelled.
		select {
		case <-ctx.Done():
			return
		default:
			// continue!
		}
	}
}

func (s *InMemoryStore) Query(ctx context.Context, prefix string, startingPosition int64, ch chan simplestore.QueryItem) {
	defer close(ch)
	s.mu.Lock()

	if len(s.ordered) < int(startingPosition) {
		s.mu.Unlock()
		return
	}

	eventsToBeSent := s.ordered[startingPosition:]
	s.mu.Unlock()

	for i, event := range eventsToBeSent {
		if event.Stream[:len(prefix)] != prefix {
			continue
		}

		ch <- simplestore.QueryItem{
			EventInStream: &event,
			Position:      int64(i),
		}

		// Check if context is cancelled.
		select {
		case <-ctx.Done():
			return
		default:
			// continue!
		}
	}
}
