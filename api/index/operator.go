package index

import (
	"context"
	"fmt"
	"github.com/apple/foundationdb/bindings/go/src/fdb"
	"github.com/apple/foundationdb/bindings/go/src/fdb/tuple"
	streamstore2 "github.com/sroze/fossil/streamstore"
)

// Operator is responsible for reading & writing into indexes.
type Operator struct {
	indexLocator IndexLocator
	db           fdb.Database
}

type ReadIndexItem struct {
	EventInStream streamstore2.EventInStream
	Error         error

	// TODO: EndOfIndex
}

func NewOperator(im IndexLocator, db fdb.Database) *Operator {
	return &Operator{im, db}
}

// OnWrite is the hook called when a write is performed on `streamstore`.
func (o *Operator) OnWrite(t fdb.Transaction, writes []streamstore2.AppendToStream, results []streamstore2.AppendResult) error {
	for i, write := range writes {
		indexes := o.indexLocator.GetIndexesToWriteInto(write.Stream)
		for _, index := range indexes {
			err := o.writeInIndex(t, index, write, results[i])
			if err != nil {
				return err
			}
		}
	}

	return nil
}

func (o *Operator) ReadFromIndexes(ctx context.Context, streamPrefix string, fromVersion uint64, ch chan ReadIndexItem) {
	indexes := o.indexLocator.GetIndexesToReadFrom(streamPrefix)
	if len(indexes) == 0 {
		ch <- ReadIndexItem{Error: fmt.Errorf("no index found to read from for this stream prefix")}
		return
	}
	if len(indexes) != 1 {
		ch <- ReadIndexItem{Error: fmt.Errorf("reading from multiple indexes is not supported yet")}
		return
	}

	_, err := o.db.ReadTransact(func(t fdb.ReadTransaction) (interface{}, error) {
		ri := t.GetRange(fdb.KeyRange{
			Begin: fdb.Key(append(tuple.Tuple{"indexFor1", indexes[0].Id}.Pack(), 0x00)),
			End:   fdb.Key(append(tuple.Tuple{"indexFor1", indexes[0].Id}.Pack(), 0xFF)),
		}, fdb.RangeOptions{}).Iterator()

		for ri.Advance() {
			kv := ri.MustGet()

			referenceKey := fdb.Key(kv.Value)

			// TODO: use `stream` and add to `EventInStream`
			_, _, err := streamstore2.ReverseEventInStreamKey(referenceKey)
			if err != nil {
				return nil, fmt.Errorf("unable to reverse reference key")
			}

			value := t.Get(referenceKey).MustGet()
			if value == nil {
				return nil, fmt.Errorf("unable to get event value: %s", referenceKey)
			}

			event, err := streamstore2.EventInStreamFromKeyValue(fdb.KeyValue{
				Key:   referenceKey,
				Value: value,
			})
			if err != nil {
				return nil, err
			}

			ch <- ReadIndexItem{
				EventInStream: event,
			}

			// Check that the context is not done before continuing.
			select {
			case <-ctx.Done():
				break
			default:
			}
		}

		return nil, nil
	})

	if err != nil {
		ch <- ReadIndexItem{
			Error: err,
		}
	}
}

func (o *Operator) writeInIndex(t fdb.Transaction, index Index, write streamstore2.AppendToStream, result streamstore2.AppendResult) error {
	for i, _ := range write.Events {
		packed, err := tuple.Tuple{"indexFor1", index.Id, tuple.IncompleteVersionstamp(uint16(i))}.PackWithVersionstamp(nil)
		if err != nil {
			return err
		}

		t.SetVersionstampedKey(
			fdb.Key(packed),
			streamstore2.EventInStreamKey(write.Stream, result.Position-uint64(len(write.Events)-i-1)).FDBKey(),
		)
	}

	return nil
}
