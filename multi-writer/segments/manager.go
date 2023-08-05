package segments

//type SegmentManager struct {
//	w           eskit.ActorWriter
//	graphReader eskit.ActorReader[GraphState]
//}
//
//func NewSegmentManager(graphReader eskit.ActorReader[GraphState], w eskit.ActorWriter) SegmentManager {
//	return SegmentManager{
//		graphReader: graphReader,
//		w:           w,
//	}
//}
//
//func (m *SegmentManager) SplitSegment(segment Segment, into []Segment) error {
//	position := m.graphReader.GetPosition()
//
//	// TODO: invariant checks.
//
//	// Write event.
//	r, err := m.w.Write([]SegmentSplitEvent{{
//		SplitSegmentId: segment.Id,
//		Into:           into,
//	}}, position)
//
//	if err != nil {
//		return err
//	}
//
//	// Wait for the graph reader to have caught up.
//	m.graphReader.WaitForPosition(r.Position)
//
//	return nil
//}
//
//func (m *SegmentManager) MergeSegments(segments []Segment, into Segment) error {
//	return nil
//}
