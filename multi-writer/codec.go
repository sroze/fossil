package multi_writer

import (
	"github.com/sroze/fossil/eskit/codec"
	"github.com/sroze/fossil/multi-writer/segments"
	"github.com/sroze/fossil/presence"
)

var rootCodec = codec.NewGobCodec(
	segments.SegmentCreatedEvent{},
	segments.SegmentAllocatedEvent{},
	segments.HashSplitRange{},
	presence.NodeJoinedEvent{},
	presence.NodeLeftEvent{},
)
