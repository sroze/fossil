package segmentplacement

func (tree SegmentNodes) Find(
	condition func(SegmentNode) bool,
) (SegmentNode, bool) {
	for _, node := range tree {
		if condition(node) {
			return node, true
		}

		if len(node.Next) > 0 {
			return node.Next.Find(condition)
		}
	}

	return SegmentNode{}, false
}

func (tree SegmentNodes) Filter(
	condition func(SegmentNode) bool,
) SegmentNodes {
	filtered := SegmentNodes{}

	for _, node := range tree {
		if condition(node) {
			if len(node.Next) > 0 {
				node.Next = node.Next.Filter(condition)
			}

			filtered = append(filtered, node)
		}
	}

	return filtered
}

func (tree SegmentNodes) WalkAndModify(
	walker func(SegmentNode) (bool, SegmentNode),
) SegmentNodes {
	treeCopy := tree
	for i, node := range tree {
		shouldWalk, newNode := walker(node)

		if shouldWalk && len(node.Next) > 0 {
			newNode.Next = node.Next.WalkAndModify(walker)
		}

		treeCopy[i] = newNode
	}

	return treeCopy
}

func (tree SegmentNodes) Count() int {
	count := 0

	for _, node := range tree {
		count += 1

		if len(node.Next) > 0 {
			count += node.Next.Count()
		}
	}

	return count
}
