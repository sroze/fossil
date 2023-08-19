package eskit

import (
	"context"
	"github.com/sroze/fossil/eskit/codec"
	"github.com/sroze/fossil/simplestore"
)

type EventInStream struct {
	Event    interface{}
	Position int64
}

type ReadItem struct {
	Error             error
	EventInStream     *EventInStream
	EndOfStreamSignal *simplestore.EndOfStreamSignal
}

type Reader interface {
	// Read reads the stream and sends the events to the channel.
	// Events are decoded using the codec provided when creating the reader.
	// EndOfStreamSignal is sent when the end of the stream is reached.
	// The channel is closed when the context is done.
	Read(ctx context.Context, stream string, startingPosition int64, ch chan ReadItem)
}

type EventToWrite struct {
	Stream           string
	Event            interface{}
	ExpectedPosition *int64
}

type Writer interface {
	// Write writes the events to the stream.
	Write(events []EventToWrite) ([]simplestore.AppendResult, error)
}

type ReaderWriter struct {
	store simplestore.Store
	codec codec.Codec
}

func NewReaderWriter(
	store simplestore.Store,
	codec codec.Codec,
) *ReaderWriter {
	return &ReaderWriter{
		store: store,
		codec: codec,
	}
}

func (rw *ReaderWriter) Write(events []EventToWrite) ([]simplestore.AppendResult, error) {
	commands := make([]simplestore.AppendToStream, len(events))
	for i, event := range events {
		serializedEvent, err := rw.codec.Serialize(event.Event)
		if err != nil {
			return nil, err
		}

		commands[i] = simplestore.AppendToStream{
			Stream: event.Stream,
			Events: []simplestore.Event{serializedEvent},
			Condition: &simplestore.AppendCondition{
				WriteAtPosition: *event.ExpectedPosition + 1,
			},
		}
	}

	return rw.store.Write(commands)
}

func (rw *ReaderWriter) Read(ctx context.Context, stream string, startingPosition int64, ch chan ReadItem) {
	defer close(ch)
	intermediaryCh := make(chan simplestore.ReadItem, 10)
	go rw.store.Read(ctx, stream, intermediaryCh, simplestore.ReadOptions{
		StartingPosition: startingPosition,
	})
	rw.transformToDecodedChannel(ctx, intermediaryCh, ch)
}

func (rw *ReaderWriter) transformToDecodedChannel(ctx context.Context, source chan simplestore.ReadItem, target chan ReadItem) {
	for item := range source {
		if item.Error != nil {
			target <- ReadItem{
				Error: item.Error,
			}
			return
		}

		if item.EventInStream != nil {
			event, err := rw.codec.Deserialize(item.EventInStream.Event)
			if err != nil {
				target <- ReadItem{Error: err}
				return
			}

			target <- ReadItem{
				EventInStream: &EventInStream{
					Event:    event,
					Position: item.EventInStream.Position,
				},
			}
		}

		if item.EndOfStreamSignal != nil {
			target <- ReadItem{
				EndOfStreamSignal: item.EndOfStreamSignal,
			}
		}

		// Check that the context is not done before continuing.
		select {
		case <-ctx.Done():
			break
		default:
			// continue!
		}
	}
}
