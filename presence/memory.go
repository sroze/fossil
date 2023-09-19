package presence

import "github.com/google/uuid"

type InMemoryPresence struct {
	NodePresence

	nodes map[uuid.UUID]Node
}

func NewInMemoryPresence(list []Node) *InMemoryPresence {
	nodes := map[uuid.UUID]Node{}
	for _, node := range list {
		nodes[node.Id] = node
	}

	return &InMemoryPresence{nodes: nodes}
}

func (p *InMemoryPresence) Available() map[uuid.UUID]Node {
	return p.nodes
}
