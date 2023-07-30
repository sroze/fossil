package index

type Status int

const (
	// READY The index is ready to be read from.
	READY Status = 1
)

// An Index will contain an ordered list of events, for a given stream name range.
type Index struct {
	// The index id.
	Id string

	// The stream prefix.
	StreamPrefix string

	// The status of the index.
	Status Status
}
