package eskit

import (
	"context"
	"fmt"
	"sync"
)

type Subscription interface {
	WaitEndOfStream()
	Start() error
	Stop()
}

// SubscriptionFunc is the main function of a subscription. It receives the event and the position,
// and returns an error if the subscription should stop.
type SubscriptionFunc func(item ReadItem) error

type SubscriptionImpl struct {
	Subscription

	// Provided by the user.
	reader           Reader
	stream           string
	subscriptionFunc SubscriptionFunc

	// Internal matters.
	isEndOfStream bool
	endOfStreamWg *sync.WaitGroup
	ctx           context.Context
	ctxCancel     context.CancelFunc
}

func NewSubscription(
	reader Reader,
	stream string,
	f SubscriptionFunc,
) Subscription {
	wg := sync.WaitGroup{}
	wg.Add(1)

	return &SubscriptionImpl{
		reader:           reader,
		stream:           stream,
		endOfStreamWg:    &wg,
		subscriptionFunc: f,
	}
}

// TODO: provides an `error` channel, as arg here or at creation.
func (a *SubscriptionImpl) Start() error {
	if a.ctx != nil {
		return fmt.Errorf("already started")
	}

	a.ctx, a.ctxCancel = context.WithCancel(context.Background())
	chEvents := make(chan ReadItem)

	// Consume events
	go func() {
		for item := range chEvents {
			if item.Error != nil {
				// FIXME: handle error
				panic(item.Error)
			}

			if item.EndOfStreamSignal != nil {
				if !a.isEndOfStream {
					a.isEndOfStream = true
					a.endOfStreamWg.Done()
				}
			}

			err := a.subscriptionFunc(item)
			if err != nil {
				// FIXME: handle error
				panic(err)
			}
		}
	}()

	go a.reader.ReadAndFollow(a.ctx, a.stream, 0, chEvents)

	return nil
}

// TODO: stop waiting when the actor fails and returns the error.
func (a *SubscriptionImpl) WaitEndOfStream() {
	a.endOfStreamWg.Wait()
}

func (a *SubscriptionImpl) Stop() {
	if a.ctx != nil {
		a.ctxCancel()
	}
}
