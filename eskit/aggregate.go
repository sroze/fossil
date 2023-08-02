package eskit

import "fmt"

type EvolveFunc[T any] func(state T, event interface{}) T

type Aggregate[T any] struct {
	// Provided by the user.
	evolve EvolveFunc[T]

	// Exposed to the user.
	State    T
	Position uint64
}

func NewAggregate[T any](
	initialState T,
	evolveFunc EvolveFunc[T],
) *Aggregate[T] {
	return &Aggregate[T]{
		State:  initialState,
		evolve: evolveFunc,
	}
}

func NewAggregateFromEvents[T any](
	initialState T,
	evolveFunc EvolveFunc[T],
	events []interface{},
) *Aggregate[T] {
	a := &Aggregate[T]{
		State:  initialState,
		evolve: evolveFunc,
	}

	for i, event := range events {
		err := a.Apply(event, uint64(i+1))
		if err != nil {
			panic(err)
		}
	}

	return a
}

func (a *Aggregate[T]) Apply(event interface{}, position uint64) error {
	if a.Position != position {
		return fmt.Errorf("expected position %d, but got %d", a.Position, position)
	}

	a.State = a.evolve(a.State, event)
	a.Position = position

	return nil
}
