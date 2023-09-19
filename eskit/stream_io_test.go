package eskit

import (
	"context"
	"github.com/google/uuid"
	"github.com/sroze/fossil/eskit/codec"
	"github.com/stretchr/testify/assert"
	"testing"
)

type EventA struct {
	A string
}

func Test_ReaderWriter(t *testing.T) {
	t.Run("writes structures and reads them", func(t *testing.T) {
		stream := "test" + uuid.NewString()
		rw := NewReaderWriter(NewInMemoryStore(), codec.NewGobCodec(EventA{}))

		_, err := rw.Write([]EventToWrite{
			{
				Stream: stream,
				Event:  EventA{A: "foo"},
			},
		})
		assert.Nil(t, err)

		ch := make(chan ReadItem, 1)
		go rw.Read(context.Background(), stream, 0, ch)

		item := <-ch
		assert.Equal(t, &EventA{A: "foo"}, item.EventInStream.Event)
	})
}
