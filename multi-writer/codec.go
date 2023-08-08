package multi_writer

import (
	"github.com/sroze/fossil/eskit/codec"
	"github.com/sroze/fossil/presence"
	"github.com/sroze/fossil/segments"
	"github.com/sroze/fossil/topology"
)

var RootCodec = codec.NewGobCodec(
	topology.SegmentCreatedEvent{},
	topology.SegmentReplacedEvent{},
	topology.SegmentSplitEvent{},
	segments.HashSplitRange{},
	segments.PrefixRange{},
	segments.ComposedRange{},
	presence.NodeJoinedEvent{},
	presence.NodeLeftEvent{},
)
