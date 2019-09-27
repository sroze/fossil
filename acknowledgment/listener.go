package acknowledgment

import (
	"fmt"
	"time"
)

type Acknowledgment struct {
	messageId string
	consumerId string
}

func NewAckListener(broadcaster *StringChannelBroadcaster, messageId string) AckListener {
	return AckListener{
		messageId:   messageId,
		acksChannel: broadcaster.NewSubscriber(),
		acknowledgment: make(chan *Acknowledgment, 1),
		broadcaster: broadcaster,
	}
}

type AckListener struct {
	messageId string
	broadcaster *StringChannelBroadcaster
	acksChannel chan string
	acknowledgment chan *Acknowledgment
}

func (l AckListener) Listen() {
	go func() {
		for ackedMessage := range l.acksChannel {
			if l.messageId == ackedMessage {
				l.acknowledgment <- &Acknowledgment{}
			}
		}
	}()
}

func (l AckListener) WaitsFor(duration time.Duration) (error, *Acknowledgment) {
	defer l.broadcaster.RemoveSubscriber(l.acksChannel)

	select {
		case ack := <-l.acknowledgment:
			return nil, ack
		case <-time.After(duration):
			return fmt.Errorf("Time out."), nil
	}
}
