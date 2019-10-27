package store

import (
	"fmt"
	"github.com/dgrijalva/jwt-go"
	"github.com/go-chi/jwtauth"
	"github.com/sroze/fossil/concurrency"
	"net/http"
	"net/http/httptest"
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

func TestHttpServer(t *testing.T) {
	storage := NewInMemoryStorage()
	collector := NewCollector(
		storage,
		NewInMemoryPublisher(),
	)

	t.Run("tells more about fossil in /about", func(t *testing.T) {
		server := NewFossilServer(
			collector,
			NewEventStreamFactory(storage),
			storage,
			storage,
			concurrency.NewInMemoryLock(),
			"",
		)

		request, _ := http.NewRequest(http.MethodGet, "/about", nil)
		response := httptest.NewRecorder()

		server.ServeHTTP(response, request)

		ExpectResponseCode(t, response, 302)
	})

	t.Run("with a required token", func(t *testing.T) {
		jwtSecret := "secret"
		server := NewFossilServer(
			collector,
			NewEventStreamFactory(storage),
			storage,
			storage,
			concurrency.NewInMemoryLock(),
			jwtSecret,
		)

		t.Run("does not allow request without a token", func(t *testing.T) {
			request, _ := http.NewRequest(http.MethodGet, "/about", nil)
			response := httptest.NewRecorder()

			server.ServeHTTP(response, request)

			ExpectResponseCode(t, response, 401)
		})

		t.Run("refuses authentication without a valid token", func(t *testing.T) {
			tokenAuth := jwtauth.New("HS256", []byte("anotherSecret"), nil)
			_, tokenString, _ := tokenAuth.Encode(jwt.MapClaims{"sub": 123})

			request, _ := http.NewRequest(http.MethodGet, "/about", nil)
			request.Header.Set("Authorization", fmt.Sprintf("Bearer %s", tokenString))
			response := httptest.NewRecorder()

			server.ServeHTTP(response, request)

			ExpectResponseCode(t, response, 401)
		})

		t.Run("get through with a token", func(t *testing.T) {
			tokenAuth := jwtauth.New("HS256", []byte(jwtSecret), nil)
			_, tokenString, _ := tokenAuth.Encode(jwt.MapClaims{"sub": 123})

			request, _ := http.NewRequest(http.MethodGet, "/about", nil)
			request.Header.Set("Authorization", fmt.Sprintf("Bearer %s", tokenString))
			response := httptest.NewRecorder()

			server.ServeHTTP(response, request)

			ExpectResponseCode(t, response, 302)
		})
	})
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
