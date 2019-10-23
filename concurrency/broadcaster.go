package concurrency

import (
	"fmt"
	cloudevents "github.com/cloudevents/sdk-go"
	"sync"
)

// ChannelBroadcaster broadcasts data from a channel to multiple channels
type ChannelBroadcaster struct {
	Source      chan cloudevents.Event
	Subscribers map[chan cloudevents.Event]struct{}
	mutex       sync.Mutex
	capacity    uint64
}

func NewChannelBroadcaster(capacity uint64) *ChannelBroadcaster {
	b := &ChannelBroadcaster{
		Source:      make(chan cloudevents.Event, capacity),
		Subscribers: make(map[chan cloudevents.Event]struct{}),
		capacity:    capacity,
	}
	go b.dispatch()
	return b
}

// Dispatch starts dispatching message
func (b *ChannelBroadcaster) dispatch() {
	// for iterates until the channel is closed
	for val := range b.Source {
		b.mutex.Lock()
		for ch := range b.Subscribers {
			ch <- val
		}
		b.mutex.Unlock()
	}

	b.mutex.Lock()
	for ch := range b.Subscribers {
		close(ch)
		// you shouldn't be calling RemoveSubscriber after closing b.Source
		// but it's better to be safe than sorry
		delete(b.Subscribers, ch)
	}
	b.Subscribers = nil
	b.mutex.Unlock()
}

func (b *ChannelBroadcaster) NewSubscriber() chan cloudevents.Event {
	ch := make(chan cloudevents.Event, b.capacity)
	b.mutex.Lock()
	if b.Subscribers == nil {
		panic(fmt.Errorf("NewSubscriber called on closed broadcaster"))
	}
	b.Subscribers[ch] = struct{}{}
	b.mutex.Unlock()

	return ch
}

func (b *ChannelBroadcaster) RemoveSubscriber(ch chan cloudevents.Event) {
	b.mutex.Lock()
	if _, ok := b.Subscribers[ch]; ok {
		close(ch)                 // this line does have to be inside the if to prevent close of closed channel, in case RemoveSubscriber is called twice on the same channel
		delete(b.Subscribers, ch) // this line doesn't need to be inside the if
	}
	b.mutex.Unlock()
}
