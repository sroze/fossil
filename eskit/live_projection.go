package eskit

import (
	"context"
	"github.com/sroze/fossil/eskit/codec"
	"github.com/sroze/fossil/livetail"
	"github.com/sroze/fossil/streamstore"
)

type LiveProjection[T any] struct {
	codec      codec.Codec
	tail       *livetail.LiveTail
	projection *Projection[T]
}

func NewLiveProjection[T any](
	tail *livetail.LiveTail,
	codec codec.Codec,
	initialState T,
	evolve func(T, interface{}) T,
) *LiveProjection[T] {
	sp := LiveProjection[T]{
		tail:  tail,
		codec: codec,
	}

	sp.projection = NewProjection[T](
		initialState,
		evolve,
	)

	return &sp
}

func (sp *LiveProjection[T]) GetState() T {
	return sp.projection.GetState()
}

func (sp *LiveProjection[T]) GetPosition() int64 {
	return sp.projection.GetPosition()
}

func (sp *LiveProjection[T]) WaitEndOfStream() {
	sp.tail.WaitEndOfStream()
}

func (sp *LiveProjection[T]) WaitForPosition(ctx context.Context, position int64) {
	sp.projection.WaitForPosition(ctx, position)
}

func (sp *LiveProjection[T]) Start() {
	ch := make(chan streamstore.ReadItem)
	go func() {
		for item := range ch {

			if item.EventInStream != nil {
				deserialized, err := sp.codec.Deserialize(item.EventInStream.Event)
				if err != nil {
					panic(err)
				}

				err = sp.projection.Apply(deserialized, item.EventInStream.Position-1)
				if err != nil {
					panic(err)
				}
			}
		}
	}()

	go sp.tail.Start("0", ch)
}

func (sp *LiveProjection[T]) Stop() {
	sp.tail.Stop()
}
