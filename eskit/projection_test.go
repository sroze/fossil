package eskit

import (
	"context"
	"fmt"
	"github.com/stretchr/testify/assert"
	"testing"
	"time"
)

type stringAppendState string

func evolveStringAppend(state stringAppendState, event interface{}) stringAppendState {
	switch e := event.(type) {
	case *appendEvent:
		state = stringAppendState(string(state) + e.S)
	default:
		panic(fmt.Errorf("unknown event type %T", event))
	}

	return state
}

type appendEvent struct {
	S string
}

func Test_Projection_Apply(t *testing.T) {
	t.Run("fails if position is different", func(t *testing.T) {
		p := NewProjection("a", evolveStringAppend)
		assert.NotNil(t, p.Apply(&appendEvent{S: "b"}, 0))
		assert.Nil(t, p.Apply(&appendEvent{S: "b"}, -1))
	})
}

func Test_Projection_WaitForPosition(t *testing.T) {
	t.Run("wait for the first event", func(t *testing.T) {
		p := NewProjection("a", evolveStringAppend)
		events := make(chan string, 2)
		go func() {
			events <- "start-waiting"
			p.WaitForPosition(context.Background(), 0)
			events <- "finished-waiting"
		}()

		go func() {
			time.Sleep(5 * time.Millisecond)
			events <- "start-applying"
			assert.Nil(t, p.Apply(&appendEvent{
				S: "b",
			}, -1))
		}()

		assert.Equal(t, "start-waiting", <-events)
		assert.Equal(t, "start-applying", <-events)
		assert.Equal(t, "finished-waiting", <-events)
	})
}
