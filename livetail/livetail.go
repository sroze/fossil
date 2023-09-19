package livetail

import (
	"context"
	"fmt"
	"github.com/sroze/fossil/simplestore"
	"strconv"
	"sync"
	"time"
)

type LiveTail struct {
	// Provided by the user.
	reader Reader

	// Internal matters.
	isEndOfStream bool
	endOfStreamWg *sync.WaitGroup
	ctx           context.Context
	ctxCancel     context.CancelFunc
}

func NewLiveTail(
	reader Reader,
) *LiveTail {
	wg := sync.WaitGroup{}
	wg.Add(1)

	return &LiveTail{
		reader:        reader,
		endOfStreamWg: &wg,
	}
}

func (a *LiveTail) Start(startingPosition string, ch chan simplestore.ReadItem) {
	if a.ctx != nil {
		ch <- simplestore.ReadItem{Error: fmt.Errorf("livetail is already started")}

		return
	}

	a.ctx, a.ctxCancel = context.WithCancel(context.Background())
	chEvents := make(chan simplestore.ReadItem)
	defer close(chEvents)

	// Loop through all received events, handle our internal logic and
	// forward the event to the user.
	go func() {
		defer close(ch)

		for item := range chEvents {
			ch <- item

			if item.EndOfStreamSignal != nil {
				if !a.isEndOfStream {
					a.isEndOfStream = true
					a.endOfStreamWg.Done()
				}
			}

			if item.Error != nil {
				break
			}
		}
	}()

	position := startingPosition
	for {
		readChannel := make(chan simplestore.ReadItem)
		wg := sync.WaitGroup{}
		wg.Add(1)

		nextPosition := position

		go func() {
			defer wg.Done()

			for {
				select {
				case <-a.ctx.Done():
					return
				case item, more := <-readChannel:
					if !more {
						i, err := strconv.ParseInt(nextPosition, 10, 64)
						if err != nil {
							panic(err)
						}

						chEvents <- simplestore.ReadItem{
							EndOfStreamSignal: &simplestore.EndOfStreamSignal{
								StreamPosition: i - 1,
							},
						}

						return
					}

					chEvents <- item

					if item.EventInStream != nil {
						nextPosition = strconv.FormatInt(item.EventInStream.Position+1, 10)
					}
				}
			}
		}()

		go a.reader.Read(a.ctx, position, readChannel)
		wg.Wait()
		position = nextPosition

		select {
		case <-a.ctx.Done():
			return
		case <-time.After(100 * time.Millisecond):
			// We waited... let's continue!
			// TODO: we need to be much more clever here, waiting 0 if things were
			//       received, otherwise gradually increasing sleep with the ability
			// 		 to be woken up by gossip events of writes.
			continue
		}
	}
}

// TODO: stop waiting when the livetail fails and returns the error.
func (a *LiveTail) WaitEndOfStream() {
	a.endOfStreamWg.Wait()
}

func (a *LiveTail) Stop() {
	if a.ctx != nil {
		a.ctxCancel()
	}
}
