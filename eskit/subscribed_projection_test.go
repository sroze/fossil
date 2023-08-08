package eskit

import (
	"github.com/google/uuid"
	"github.com/sroze/fossil/eskit/codec"
	"github.com/stretchr/testify/assert"
	"testing"
)

func Test_SubscribedProjection(t *testing.T) {
	// applies a few events.
	rw := NewReaderWriter(NewInMemoryStore(), codec.NewGobCodec(
		appendEvent{},
	))
	stream := "foo/" + uuid.NewString()
	p := NewSubscribedProjection(
		rw,
		stream,
		"a",
		evolveStringAppend,
	)

	t.Run("is ready after the first event", func(t *testing.T) {
		_, err := rw.Write([]EventToWrite{
			{Stream: stream, Event: appendEvent{S: "b"}},
		})
		assert.Nil(t, err)

		assert.Nil(t, p.Start())
		defer p.Stop()
		p.WaitEndOfStream()

		assert.Equal(t, stringAppendState("ab"), p.GetState())
	})
}
