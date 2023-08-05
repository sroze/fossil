package eskit

import (
	"context"
	"fmt"
	"github.com/dustin/go-broadcast"
	streamstore2 "github.com/sroze/fossil/store/streamstore"
	"sync"
)

type InMemoryStore struct {
	streamstore2.Store

	store map[string][]streamstore2.Event
	b     broadcast.Broadcaster
	mu    sync.Mutex
}

type appendNotification struct {
	stream   string
	position uint64
}

func NewInMemoryStore() *InMemoryStore {
	return &InMemoryStore{
		store: map[string][]streamstore2.Event{},
		b:     broadcast.NewBroadcaster(1),
	}
}

func (s *InMemoryStore) Write(commands []streamstore2.AppendToStream) ([]streamstore2.AppendResult, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	results := make([]streamstore2.AppendResult, len(commands))

	for i, command := range commands {
		if _, ok := s.store[command.Stream]; !ok {
			s.store[command.Stream] = []streamstore2.Event{}
		}

		positionOfFirstEvent := uint64(len(s.store[command.Stream]))
		if command.ExpectedPosition != nil && *command.ExpectedPosition != positionOfFirstEvent {
			return nil, fmt.Errorf("expected position %d, but got %d", *command.ExpectedPosition, positionOfFirstEvent)
		}

		for _, event := range command.Events {
			s.store[command.Stream] = append(s.store[command.Stream], event)
		}

		results[i] = streamstore2.AppendResult{
			Position: positionOfFirstEvent + uint64(len(command.Events)) - 1,
		}

		s.b.Submit(appendNotification{
			stream:   command.Stream,
			position: results[i].Position,
		})
	}

	return results, nil
}

func (s *InMemoryStore) Read(ctx context.Context, stream string, startingPosition uint64, ch chan streamstore2.ReadItem) {
	s.mu.Lock()

	if len(s.store[stream]) < int(startingPosition) {
		s.mu.Unlock()
		return
	}

	eventsToBeSent := s.store[stream][startingPosition:]
	s.mu.Unlock()

	for i, event := range eventsToBeSent {
		ch <- streamstore2.ReadItem{
			EventInStream: &streamstore2.EventInStream{
				Event:    event,
				Position: startingPosition + uint64(i),
			},
		}
	}
}

func (s *InMemoryStore) ReadAndFollow(ctx context.Context, stream string, startingPosition uint64, ch chan streamstore2.ReadItem) {
	s.Read(ctx, stream, startingPosition, ch)
	nextPosition := uint64(len(s.store[stream]))
	ch <- streamstore2.ReadItem{
		EndOfStreamSignal: &streamstore2.EndOfStreamSignal{
			StreamPosition: nextPosition,
		},
	}

	err := s.WaitForEvent(ctx, stream, nextPosition)
	if err != nil {
		ch <- streamstore2.ReadItem{
			Error: err,
		}
	}

	s.ReadAndFollow(ctx, stream, nextPosition, ch)
}

func (s *InMemoryStore) WaitForEvent(ctx context.Context, stream string, currentPosition uint64) error {
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
