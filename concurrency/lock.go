package concurrency

import (
	"context"
	"sync"
)

type LockForIdentifier struct {
	mutex             *sync.Mutex
	numberOfConsumers int
}

type InMemoryLock struct {
	locks   *sync.Mutex
	mutexes map[string]*LockForIdentifier
}

func NewInMemoryLock() *InMemoryLock {
	return &InMemoryLock{
		locks:   &sync.Mutex{},
		mutexes: make(map[string]*LockForIdentifier),
	}
}

func (l *InMemoryLock) Lock(ctx context.Context, identifier string) error {
	l.locks.Lock()
	_, exists := l.mutexes[identifier]
	if !exists {
		l.mutexes[identifier] = &LockForIdentifier{
			mutex:             &sync.Mutex{},
			numberOfConsumers: 0,
		}
	}

	l.mutexes[identifier].numberOfConsumers += 1
	l.locks.Unlock()

	l.mutexes[identifier].mutex.Lock()

	return nil
}

func (l *InMemoryLock) Release(identifier string) error {
	l.mutexes[identifier].mutex.Unlock()

	l.locks.Lock()
	l.mutexes[identifier].numberOfConsumers -= 1
	if l.mutexes[identifier].numberOfConsumers == 0 {
		delete(l.mutexes, identifier)
	}
	l.locks.Unlock()

	return nil
}
