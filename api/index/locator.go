package index

type IndexLocator interface {
	GetIndexesToWriteInto(streamName string) []Index
	GetIndexesToReadFrom(streamPrefix string) []Index
}
