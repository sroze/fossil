package eskit

type SubscribedProjection[T any] struct {
	subscription Subscription
	projection   *Projection[T]
}

func NewSubscribedProjection[T any](
	reader Reader,
	stream string,
	initialState T,
	evolve func(T, interface{}) T,
) *SubscribedProjection[T] {
	sp := SubscribedProjection[T]{}
	sp.projection = NewProjection[T](
		initialState,
		evolve,
	)

	sp.subscription = NewSubscription(
		reader,
		stream,
		sp.act,
	)

	return &sp
}

func (sp *SubscribedProjection[T]) act(item ReadItem) error {
	if item.EventInStream != nil {
		return sp.projection.Apply(item.EventInStream.Event, item.EventInStream.Position)
	}

	return nil
}

func (sp *SubscribedProjection[T]) GetState() T {
	return sp.projection.GetState()
}

func (sp *SubscribedProjection[T]) GetPosition() uint64 {
	return sp.projection.GetPosition()
}

func (sp *SubscribedProjection[T]) WaitEndOfStream() {
	sp.subscription.WaitEndOfStream()
}

func (sp *SubscribedProjection[T]) Start() error {
	return sp.subscription.Start()
}

func (sp *SubscribedProjection[T]) Stop() {
	sp.subscription.Stop()
}
