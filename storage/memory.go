package storage

import cloudevents "github.com/cloudevents/sdk-go"

type EventInStream struct {
	event cloudevents.Event
	stream string
}

type InMemoryStorage struct {
	Events []EventInStream
}

func NewInMemoryStorage() *InMemoryStorage {
	return &InMemoryStorage{
		Events: make([]EventInStream, 0),
	}
}

func (s *InMemoryStorage) Store(stream string, event cloudevents.Event) error {
	s.Events = append(s.Events, EventInStream{event, stream })

	return nil
}

func (s *InMemoryStorage) FindAll(stream string) (events []cloudevents.Event, e error) {
	for _, eventInStorage := range s.Events {
		if eventInStorage.stream == stream {
			events = append(events, eventInStorage.event)
		}
	}

	return
}

func (s *InMemoryStorage) NewTransaction() (EventStoreTransaction, error) {
	return s, nil
}

func (s *InMemoryStorage) Commit() error {
	return nil
}
func (s *InMemoryStorage) Rollback() error {
	return nil
}
