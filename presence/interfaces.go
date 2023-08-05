package presence

import "github.com/google/uuid"

type Node struct {
	Id uuid.UUID
}

type NodePresence interface {
	Available() map[uuid.UUID]Node
}
