package eskit

import (
	"context"
	"fmt"
	"github.com/dustin/go-broadcast"
	"github.com/sroze/fossil/streamstore"
	"sync"
)

type InMemoryStore struct {
	store map[string][]streamstore.Event
	b     broadcast.Broadcaster
	mu    sync.Mutex
}

type appendNotification struct {
	stream   string
	position int64
}

func NewInMemoryStore() *InMemoryStore {
	return &InMemoryStore{
		store: map[string][]streamstore.Event{},
		b:     broadcast.NewBroadcaster(1),
	}
}

func (s *InMemoryStore) Write(commands []streamstore.AppendToStream) ([]streamstore.AppendResult, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	results := make([]streamstore.AppendResult, len(commands))

	for i, command := range commands {
		if _, ok := s.store[command.Stream]; !ok {
			s.store[command.Stream] = []streamstore.Event{}
		}

		positionOfFirstEvent := int64(len(s.store[command.Stream]) - 1)
		if command.ExpectedPosition != nil && *command.ExpectedPosition != positionOfFirstEvent {
			return nil, fmt.Errorf("expected position %d, but got %d", *command.ExpectedPosition, positionOfFirstEvent)
		}

		for _, event := range command.Events {
			s.store[command.Stream] = append(s.store[command.Stream], event)
		}

		results[i] = streamstore.AppendResult{
			Position: positionOfFirstEvent + int64(len(command.Events)),
		}

		s.b.Submit(appendNotification{
			stream:   command.Stream,
			position: results[i].Position,
		})
	}

	return results, nil
}

func (s *InMemoryStore) Read(ctx context.Context, stream string, startingPosition int64, ch chan streamstore.ReadItem) {
	defer close(ch)
	s.mu.Lock()

	if len(s.store[stream]) < int(startingPosition) {
		s.mu.Unlock()
		return
	}

	eventsToBeSent := s.store[stream][startingPosition:]
	s.mu.Unlock()

	for i, event := range eventsToBeSent {
		ch <- streamstore.ReadItem{
			EventInStream: &streamstore.EventInStream{
				Event:    event,
				Position: startingPosition + int64(i),
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

func (s *InMemoryStore) ReadAndFollow(ctx context.Context, stream string, startingPosition int64, ch chan streamstore.ReadItem) {
	readChannel := make(chan streamstore.ReadItem)
	go s.Read(ctx, stream, startingPosition, readChannel)
	for item := range readChannel {
		ch <- item
	}

	nextPosition := int64(len(s.store[stream]))
	ch <- streamstore.ReadItem{
		EndOfStreamSignal: &streamstore.EndOfStreamSignal{
			StreamPosition: nextPosition,
		},
	}

	// Check if context is cancelled.
	select {
	case <-ctx.Done():
		close(ch)
		return
	default:
		// continue!
	}

	err := s.WaitForEvent(ctx, stream, nextPosition)
	if err != nil {
		ch <- streamstore.ReadItem{
			Error: err,
		}
		close(ch)
		return
	}

	s.ReadAndFollow(ctx, stream, nextPosition, ch)
}

func (s *InMemoryStore) WaitForEvent(ctx context.Context, stream string, currentPosition int64) error {
	s.mu.Lock()
	events, ok := s.store[stream]
	// FIXME: test for `>` instead of `>=`
	if ok && len(events) > int(currentPosition) {
		s.mu.Unlock()
		return nil
	}

	ch := make(chan interface{})
	s.b.Register(ch)
	defer s.b.Unregister(ch)
	s.mu.Unlock()

	for {
		select {
		case <-ctx.Done():
			return nil
		case p := <-ch:
			if p.(appendNotification).stream == stream && p.(appendNotification).position >= currentPosition {
				return nil
			}
		}
	}
}
