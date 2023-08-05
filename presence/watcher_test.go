package presence

import (
	"context"
	"github.com/google/uuid"
	"github.com/sroze/fossil/eskit"
	"github.com/stretchr/testify/assert"
	"testing"
)

func Test_PresenceWatcher(t *testing.T) {
	ss := eskit.NewInMemoryStore()
	nodes := []Node{
		{Id: uuid.New()},
		{Id: uuid.New()},
	}
	presence := NewInMemoryPresence(nodes)

	t.Run("at startup, synchronises nodes", func(t *testing.T) {
		stream := "foo/" + uuid.NewString()
		pw := NewWatcher(
			ss,
			stream,
			presence,
		)

		assert.Nil(t, pw.Start())
		defer pw.Stop()
		pw.projection.WaitEndOfStream()

		ch := make(chan eskit.ReadItem)
		go pw.rw.Read(context.Background(), stream, 0, ch)
		event := <-ch
		assert.Equal(t, &NodeJoinedEvent{Node: nodes[0]}, event.EventInStream.Event)

		event = <-ch
		assert.Equal(t, &NodeJoinedEvent{Node: nodes[1]}, event.EventInStream.Event)
	})

	// TODO: when something changes, through presence channel?
	t.Skip("handle node leaving and joining once started")
}
