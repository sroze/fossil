package store

import (
	"github.com/apple/foundationdb/bindings/go/src/fdb"
	"github.com/google/uuid"
	"github.com/sroze/fossil/eskit"
	"github.com/sroze/fossil/kv/foundationdb"
	"github.com/sroze/fossil/livetail"
	"github.com/sroze/fossil/simplestore"
	"github.com/sroze/fossil/store/segments"
	"github.com/sroze/fossil/store/topology"
	"github.com/stretchr/testify/assert"
	"testing"
)

func Test_Writer(t *testing.T) {
	fdb.MustAPIVersion(720)
	kv := foundationdb.NewStore(fdb.MustOpenDatabase("../fdb.cluster"))
	ss := eskit.NewInMemoryStore()
	rw := eskit.NewReaderWriter(ss, RootCodec)

	stream := "topology/" + uuid.NewString()
	segmentManager := topology.NewManager(
		livetail.NewLiveTail(livetail.NewStreamReader(ss, stream)),
		RootCodec,
		rw,
		stream,
	)

	assert.Nil(t, segmentManager.Start())
	segmentManager.WaitReady()
	defer segmentManager.Stop()
	_, err := segmentManager.Create(segments.NewSegment(
		segments.NewPrefixRange("foo"),
	))
	assert.Nil(t, err)

	t.Run("a writer can restart and pick up the last segment's position", func(t *testing.T) {
		stream := "foo" + uuid.NewString()
		writer1 := NewSegmentStore(segmentManager, kv)
		expectedPosition := int64(-1)
		_, err := writer1.Write([]simplestore.AppendToStream{
			{
				Stream: stream,
				Events: []simplestore.Event{
					{EventId: uuid.NewString(), EventType: "Foo", Payload: []byte("foo")},
				},
				ExpectedPosition: &expectedPosition,
			},
		})
		assert.Nil(t, err)

		writer2 := NewSegmentStore(segmentManager, kv)
		expectedPosition = int64(0)
		_, err = writer2.Write([]simplestore.AppendToStream{
			{
				Stream: stream,
				Events: []simplestore.Event{
					{EventId: uuid.NewString(), EventType: "Bar", Payload: []byte("bar")},
				},
				ExpectedPosition: &expectedPosition,
			},
		})

		assert.Nil(t, err)
	})

	t.Skip("TODO: 2 concurrent writers will compete for the same segment but work")

	t.Skip("TODO: eventually consistent topology view does not cause out-of-order writes")
	// i.e. when 2 writers process requests concurrently, with different view of the world after a topology change (i.e. split or replace).
	//   -> wink, wink: "closed" segment event at the head?

	t.Skip("TODO: writing in a stream after segment has been replaced")
}
