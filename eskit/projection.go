package eskit

import (
	"context"
	"fmt"
	"github.com/dustin/go-broadcast"
)

type EvolveFunc[T any] func(state T, event interface{}) T

type Projection[T any] struct {
	// Provided by the user.
	evolve EvolveFunc[T]

	// Internal matters.
	state            T
	position         int64
	eventBroadcaster broadcast.Broadcaster
}

func NewProjection[T any](
	initialState T,
	evolveFunc EvolveFunc[T],
) *Projection[T] {
	return &Projection[T]{
		position:         -1,
		state:            initialState,
		evolve:           evolveFunc,
		eventBroadcaster: broadcast.NewBroadcaster(1),
	}
}

func NewProjectionFromEvents[T any](
	initialState T,
	evolveFunc EvolveFunc[T],
	events []interface{},
) *Projection[T] {
	a := NewProjection(initialState, evolveFunc)

	for i, event := range events {
		err := a.Apply(event, int64(i))
		if err != nil {
			panic(err)
		}
	}

	return a
}

func (a *Projection[T]) Apply(event interface{}, expectedStreamPosition int64) error {
	if a.position != expectedStreamPosition {
		return fmt.Errorf("expected position %d, but got %d", a.position, expectedStreamPosition)
	}

	a.state = a.evolve(a.state, event)
	a.position = expectedStreamPosition + 1
	a.eventBroadcaster.Submit(a.position)

	return nil
}

func (a *Projection[T]) WaitForPosition(ctx context.Context, position int64) {
	ch := make(chan interface{})
	a.eventBroadcaster.Register(ch)
	defer a.eventBroadcaster.Unregister(ch)

	if a.position >= position {
		return
	}

	for {
		select {
		case <-ctx.Done():
			return
		case p := <-ch:
			if p.(int64) >= position {
				return
			}
		}
	}
}

func (a *Projection[T]) GetState() T {
	return a.state
}

func (a *Projection[T]) GetPosition() int64 {
	return a.position
}
