package eskit

import (
	"context"
	"fmt"
	"github.com/dustin/go-broadcast"
	"github.com/sroze/fossil/store/api/streamstore"
	"github.com/sroze/fossil/store/eskit/codec"
	"sync"
)

type EvolveFunc[T any] func(state T, event interface{}) T

type Actor[T any] struct {
	// Provided by the user.
	ss     streamstore.Store
	c      codec.Codec
	stream string
	evolve EvolveFunc[T]

	// Exposed to the user.
	State    T
	Position uint64

	// Internal matters.
	isReady          bool
	readyWg          *sync.WaitGroup
	ctx              context.Context
	ctxCancel        context.CancelFunc
	eventBroadcaster broadcast.Broadcaster
}

func NewActor[T any](
	ss streamstore.Store,
	codec codec.Codec,
	stream string,
	initialState T,
	evolveFunc EvolveFunc[T],
) *Actor[T] {
	wg := sync.WaitGroup{}
	wg.Add(1)

	return &Actor[T]{
		ss:               ss,
		c:                codec,
		stream:           stream,
		readyWg:          &wg,
		State:            initialState,
		evolve:           evolveFunc,
		eventBroadcaster: broadcast.NewBroadcaster(1),
	}
}

func (a *Actor[T]) Start() error {
	if a.ctx != nil {
		return fmt.Errorf("already started")
	}

	a.ctx, a.ctxCancel = context.WithCancel(context.Background())
	chEvents := make(chan streamstore.ReadItem)

	// Consume events
	go func() {
		for item := range chEvents {
			if item.Error != nil {
				// FIXME: handle!
				return
			}

			if item.EndOfStreamSignal != nil {
				if !a.isReady {
					a.isReady = true
					a.readyWg.Done()
				}
			}

			if item.EventInStream != nil {
				event, err := a.c.Deserialize(item.EventInStream.Event)
				if err != nil {
					panic(err)
				}

				a.State = a.evolve(a.State, event)
				a.Position = item.EventInStream.StreamPosition
				a.eventBroadcaster.Submit(a.Position)
			}
		}
	}()

	go a.ss.ReadAndFollow(a.ctx, a.stream, 0, chEvents)

	return nil
}

func (a *Actor[T]) WaitReady() {
	a.readyWg.Wait()
}

func (a *Actor[T]) Stop() {
	if a.ctx != nil {
		a.ctxCancel()
	}
}

func (a *Actor[T]) Write(m interface{}, expectedPosition uint64) error {
	event, err := a.c.Serialize(m)
	if err != nil {
		return err
	}

	_, err = a.ss.Write([]streamstore.AppendToStream{
		{
			Stream: a.stream,
			Events: []streamstore.Event{
				event,
			},
			ExpectedPosition: &expectedPosition,
		},
	})

	return err
}

func (a *Actor[T]) WaitForPosition(position uint64) {
	ch := make(chan interface{})
	a.eventBroadcaster.Register(ch)
	defer a.eventBroadcaster.Unregister(ch)

	if a.Position >= position {
		return
	}

	for {
		select {
		case <-a.ctx.Done():
			return
		case p := <-ch:
			if p.(uint64) >= position {
				return
			}
		}
	}
}
