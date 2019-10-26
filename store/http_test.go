package store

import (
	"testing"
	"time"
)

func ExpectedConsumerTimeout(t *testing.T, configurations []WaitConsumerConfiguration, consumerName string, timeout time.Duration) {
	for _, configuration := range configurations {
		if configuration.ConsumerName == consumerName && configuration.Timeout == timeout {
			return
		}
	}

	t.Errorf("no consumer named %s with such timeout found", consumerName)
}

func ExpectedConsumerName(t *testing.T, configurations []WaitConsumerConfiguration, consumerName string) {
	for _, configuration := range configurations {
		if configuration.ConsumerName == consumerName {
			return
		}
	}

	t.Errorf("no consumer named %s found", consumerName)
}

func TestParseWaitConsumerHeader(t *testing.T) {
	t.Run("returns an error when cannot understand header", func(t *testing.T) {
		_, err := parseWaitConsumerHeader("myConsumer", "")

		if err == nil {
			t.Error("expected error for non well formatted header")
		}
	})
	t.Run("name of the consumer only", func(t *testing.T) {
		configurations, _ := parseWaitConsumerHeader("<myConsumer>", "")

		ExpectedConsumerName(t, configurations, "myConsumer")
	})

	t.Run("sets the event ID", func(t *testing.T) {
		configurations, _ := parseWaitConsumerHeader("<myConsumer>", "1234")

		ExpectedConsumerName(t, configurations, "myConsumer")
		if configurations[0].EventId != "1234" {
			t.Errorf("expected event ID 1234 but got %s", configurations[0].EventId)
		}
	})

	t.Run("gets timeouts from the parameter", func(t *testing.T) {
		configurations, _ := parseWaitConsumerHeader("<myConsumer>; timeout=\"100\"", "")

		ExpectedConsumerName(t, configurations, "myConsumer")
		ExpectedConsumerTimeout(t, configurations, "myConsumer", 100*time.Millisecond)
	})

	t.Run("gets multiple configurations", func(t *testing.T) {
		configurations, _ := parseWaitConsumerHeader("<myConsumer>; timeout=100, <secondConsumer>; timeout=5000", "")

		ExpectedConsumerName(t, configurations, "myConsumer")
		ExpectedConsumerTimeout(t, configurations, "myConsumer", 100*time.Millisecond)
		ExpectedConsumerName(t, configurations, "secondConsumer")
		ExpectedConsumerTimeout(t, configurations, "secondConsumer", 5*time.Second)
	})
}
