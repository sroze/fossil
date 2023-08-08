package segmentsstore

import (
	"github.com/sroze/fossil/streamstore"
	"github.com/stretchr/testify/assert"
	"testing"
)

func Test_StreamInMetadata(t *testing.T) {
	t.Run("adds and gets stream from metadata", func(t *testing.T) {
		event := streamstore.Event{
			EventId:   "123",
			EventType: "Foo",
			Payload:   []byte("payload"),
			Metadata: map[string]string{
				"foo": "bar",
				"123": "456",
			},
		}

		stream := "foo/bar"

		eventWithStream := AddStreamToMetadata(event, stream)
		assert.Equal(t, "bar", eventWithStream.Metadata["foo"])

		streamFromEvent, err := GetStreamFromMetadata(eventWithStream)
		assert.Nil(t, err)
		assert.Equal(t, stream, streamFromEvent)
	})
}
