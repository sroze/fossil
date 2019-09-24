package collector

import (
	"fmt"
	"sync"
)

// StringChannelBroadcaster broadcasts string data from a channel to multiple channels
type StringChannelBroadcaster struct {
	Source      chan string
	Subscribers map[chan string]struct{}
	mutex       sync.Mutex
	capacity    uint64
}

// NewStringChannelBroadcaster creates a StringChannelBroadcaster
func NewStringChannelBroadcaster(capacity uint64) *StringChannelBroadcaster {
	b := &StringChannelBroadcaster{
		Source:      make(chan string, capacity),
		Subscribers: make(map[chan string]struct{}),
		capacity:    capacity,
	}
	go b.dispatch()
	return b
}

// Dispatch starts dispatching message
func (b *StringChannelBroadcaster) dispatch() {
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

func (b *StringChannelBroadcaster) NewSubscriber() chan string {
	ch := make(chan string, b.capacity)
	b.mutex.Lock()
	if b.Subscribers == nil {
		panic(fmt.Errorf("NewSubscriber called on closed broadcaster"))
	}
	b.Subscribers[ch] = struct{}{}
	b.mutex.Unlock()

	return ch
}

// RemoveSubscriber removes a subscrber from the StringChannelBroadcaster
func (b *StringChannelBroadcaster) RemoveSubscriber(ch chan string) {
	b.mutex.Lock()
	if _, ok := b.Subscribers[ch]; ok {
		close(ch)                 // this line does have to be inside the if to prevent close of closed channel, in case RemoveSubscriber is called twice on the same channel
		delete(b.Subscribers, ch) // this line doesn't need to be inside the if
	}
	b.mutex.Unlock()
}

