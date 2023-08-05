package multi_writer

import (
	"github.com/sroze/fossil/store/eskit/codec"
	"github.com/sroze/fossil/store/multi-writer/segments"
	"github.com/sroze/fossil/store/presence"
)

var rootCodec = codec.NewGobCodec(
	segments.SegmentCreatedEvent{},
	segments.SegmentAllocatedEvent{},
	segments.HashSplitRange{},
	presence.NodeJoinedEvent{},
	presence.NodeLeftEvent{},
)
