package eskit

import (
	"context"
	"github.com/sroze/fossil/store/eskit/codec"
	streamstore2 "github.com/sroze/fossil/store/streamstore"
)

type EventInStream struct {
	Event    interface{}
	Position uint64
}

type ReadItem struct {
	Error             error
	EventInStream     *EventInStream
	EndOfStreamSignal *streamstore2.EndOfStreamSignal
}

type Reader interface {
	// Read reads the stream and sends the events to the channel.
	// Events are decoded using the codec provided when creating the reader.
	// EndOfStreamSignal is sent when the end of the stream is reached.
	// The channel is closed when the context is done.
	Read(ctx context.Context, stream string, startingPosition uint64, ch chan ReadItem)
	ReadAndFollow(ctx context.Context, stream string, startingPosition uint64, ch chan ReadItem)
}

type EventToWrite struct {
	Stream           string
	Event            interface{}
	ExpectedPosition *uint64
}

type Writer interface {
	// Write writes the events to the stream.
	Write(events []EventToWrite) ([]streamstore2.AppendResult, error)
}

type ReaderWriter struct {
	store streamstore2.Store
	codec codec.Codec
}

func NewReaderWriter(
	store streamstore2.Store,
	codec codec.Codec,
) *ReaderWriter {
	return &ReaderWriter{
		store: store,
		codec: codec,
	}
}

func (rw *ReaderWriter) Write(events []EventToWrite) ([]streamstore2.AppendResult, error) {
	commands := make([]streamstore2.AppendToStream, len(events))
	for i, event := range events {
		serializedEvent, err := rw.codec.Serialize(event.Event)
		if err != nil {
			return nil, err
		}

		commands[i] = streamstore2.AppendToStream{
			Stream:           event.Stream,
			Events:           []streamstore2.Event{serializedEvent},
			ExpectedPosition: event.ExpectedPosition,
		}
	}

	return rw.store.Write(commands)
}

func (rw *ReaderWriter) ReadAndFollow(ctx context.Context, stream string, startingPosition uint64, ch chan ReadItem) {
	defer close(ch)
	intermediaryCh := make(chan streamstore2.ReadItem, 10)
	go rw.store.ReadAndFollow(ctx, stream, startingPosition, intermediaryCh)
	rw.transformToDecodedChannel(ctx, intermediaryCh, ch)
}

func (rw *ReaderWriter) Read(ctx context.Context, stream string, startingPosition uint64, ch chan ReadItem) {
	defer close(ch)
	intermediaryCh := make(chan streamstore2.ReadItem, 10)
	go rw.store.Read(ctx, stream, startingPosition, intermediaryCh)
	rw.transformToDecodedChannel(ctx, intermediaryCh, ch)
}

func (rw *ReaderWriter) transformToDecodedChannel(ctx context.Context, source chan streamstore2.ReadItem, target chan ReadItem) {
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
