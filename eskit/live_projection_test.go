package eskit

import (
	"github.com/google/uuid"
	"github.com/sroze/fossil/eskit/codec"
	"github.com/sroze/fossil/livetail"
	"github.com/stretchr/testify/assert"
	"testing"
)

func Test_SubscribedProjection(t *testing.T) {
	// applies a few events.
	ss := NewInMemoryStore()
	c := codec.NewGobCodec(
		appendEvent{},
	)
	rw := NewReaderWriter(ss, c)
	stream := "foo/" + uuid.NewString()
	p := NewLiveProjection(
		livetail.NewLiveTail(
			livetail.NewStreamReader(ss, stream),
		),
		c,
		"a",
		evolveStringAppend,
	)

	t.Run("is ready after the first event", func(t *testing.T) {
		_, err := rw.Write([]EventToWrite{
			{Stream: stream, Event: appendEvent{S: "b"}},
		})
		assert.Nil(t, err)

		p.Start()
		defer p.Stop()
		p.WaitEndOfStream()

		assert.Equal(t, stringAppendState("ab"), p.GetState())
	})
}
