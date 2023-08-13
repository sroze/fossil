package topology

import (
	"bytes"
	"compress/zlib"
	"encoding/base64"
	"encoding/binary"
	"fmt"
	"github.com/google/uuid"
	"github.com/heimdalr/dag"
	"io"
	"sync"
)

type Position struct {
	Cursors map[uuid.UUID]int64
	mutex   sync.Mutex
}

func NewPosition() *Position {
	return &Position{
		Cursors: make(map[uuid.UUID]int64),
	}
}

// TrimForRemaining returns a new DAG with only the segments that have not been read yet,
// given the provided position.
func (p *Position) TrimForRemaining(d *dag.DAG) *dag.DAG {
	return FilterBackwardDag(d, func(v dag.IDInterface) FilterResult {
		segmentId := uuid.MustParse(v.ID())
		_, exists := p.Cursors[segmentId]
		if exists {
			return IncludeButStopWalking
		}

		descendants, err := d.GetOrderedDescendants(v.ID())
		if err != nil {
			panic(err)
		}

		// We might get to a vertex who's the starting point for a number of read and non-read paths.
		// If any of the descendants is in the cursors, we stop walking because it means this vertex was read too.
		for _, descendant := range descendants {
			descendantId := uuid.MustParse(descendant)

			_, exists := p.Cursors[descendantId]
			if exists {
				return ExcludeAndStopWalking
			}
		}

		return IncludeAndContinueWalking
	})
}

// Clone returns a copy of the position.
func (p *Position) Clone() *Position {
	p.mutex.Lock()
	defer p.mutex.Unlock()

	cursors := make(map[uuid.UUID]int64, len(p.Cursors))
	for segmentId, position := range p.Cursors {
		cursors[segmentId] = position
	}

	return &Position{Cursors: cursors}
}

// PositionInSegment returns the starting position for a given segment.
// Note that if asked about a segment that has already been read, it will return 0.
func (p *Position) PositionInSegment(segmentId uuid.UUID) int64 {
	if position, ok := p.Cursors[segmentId]; ok {
		return position
	}

	return 0
}

// AdvanceTo advances the position for the given segment. It checks that the position is not going backwards and
// will simplify the position by removing any ancestor thanks to the provided DAG.
func (p *Position) AdvanceTo(d *dag.DAG, segmentId uuid.UUID, position int64) error {
	p.mutex.Lock()
	defer p.mutex.Unlock()

	existingPosition, exists := p.Cursors[segmentId]
	if exists && position < existingPosition {
		return fmt.Errorf("cannot advance cursor for segment %s to %d because it's already at %d", segmentId, position, p.PositionInSegment(segmentId))
	}

	p.Cursors[segmentId] = position

	// If we just added the cursor for this segment, we try to clean the position by
	// removing any ancestor cursor.
	if !exists {
		ancestors, err := d.GetOrderedAncestors(segmentId.String())
		if err != nil {
			panic(err)
		}

		for _, ancestor := range ancestors {
			ancestorId := uuid.MustParse(ancestor)
			if _, exists := p.Cursors[ancestorId]; exists {
				delete(p.Cursors, ancestorId)
			}
		}
	}

	return nil
}

// Serialize returns a string representation of the position.
// It is a zlib-compressed of this binary representation:
// - 4 bytes: number of cursors
// - for each cursor:
//   - 16 bytes: segment ID
//   - 8 bytes: position
func (p *Position) Serialize() string {
	buf := make([]byte, 2+len(p.Cursors)*24)
	binary.BigEndian.PutUint16(buf[0:2], uint16(len(p.Cursors))) // 2 bytes

	i := 2
	for segmentId, position := range p.Cursors {
		copy(buf[i:i+16], segmentId[:])                          // 16 bytes
		binary.BigEndian.PutUint64(buf[i+16:], uint64(position)) // 8 bytes

		i += 24
	}

	var b bytes.Buffer
	b.Write([]byte{0x1}) // version
	w := zlib.NewWriter(&b)
	w.Write(buf)
	w.Close()

	return base64.StdEncoding.EncodeToString(b.Bytes())
}

func (p *Position) String() string {
	s := ""
	for segmentId, position := range p.Cursors {
		s += fmt.Sprintf("%s:%d ", segmentId, position)
	}

	return s
}

func NewPositionFromSerialized(serialized string) (*Position, error) {
	if serialized == "0" || serialized == "" {
		return NewPosition(), nil
	}

	b, err := base64.StdEncoding.DecodeString(serialized)
	if err != nil {
		return nil, fmt.Errorf("could not decode serialized position: %w", err)
	}

	version := b[0]
	if version != 0x1 {
		return nil, fmt.Errorf("unsupported version: %d", version)
	}

	r, err := zlib.NewReader(bytes.NewReader(b[1:]))
	if err != nil {
		return nil, fmt.Errorf("could not create zlib reader: %w", err)
	}
	defer r.Close()

	buf := make([]byte, 2)
	_, err = r.Read(buf)
	if err != nil {
		return nil, fmt.Errorf("could not read cursors count: %w", err)
	}

	cursorsCount := binary.BigEndian.Uint16(buf)
	cursors := make(map[uuid.UUID]int64, cursorsCount)

	for i := 0; i < int(cursorsCount); i++ {
		buf := make([]byte, 24)
		_, err = r.Read(buf)
		if err != nil && err != io.EOF {
			return nil, fmt.Errorf("could not read cursor %d: %w", i, err)
		}

		var segmentId uuid.UUID
		copy(segmentId[:], buf[0:16])
		position := int64(binary.BigEndian.Uint64(buf[16:]))

		cursors[segmentId] = position
	}

	return &Position{Cursors: cursors}, nil
}
