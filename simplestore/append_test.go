package simplestore

import (
	"github.com/apple/foundationdb/bindings/go/src/fdb"
	"github.com/google/uuid"
	"github.com/sroze/fossil/kv/foundationdb"
	"github.com/stretchr/testify/assert"
	"testing"
)

func Test_Store_Append(t *testing.T) {
	fdb.MustAPIVersion(720)
	s := NewStore(
		foundationdb.NewStore(fdb.MustOpenDatabase("../fdb.cluster")),
		uuid.NewString(),
	)

	t.Run("it increments stream position by default", func(t *testing.T) {
		stream := "Foo/" + uuid.NewString()
		r, err := s.Write([]AppendToStream{{
			Stream: stream,
			Events: []Event{{
				EventId:   uuid.NewString(),
				EventType: "AnEventType",
				Payload:   []byte("{\"foo\": 123}"),
			}},
		}})
		assert.Nil(t, err)
		assert.Equal(t, int64(0), r[0].Position)

		r, err = s.Write([]AppendToStream{{
			Stream: stream,
			Events: []Event{{
				EventId:   uuid.NewString(),
				EventType: "AnEventType",
				Payload:   []byte("{\"foo\": 123}"),
			}},
		}})
		assert.Nil(t, err)
		assert.Equal(t, int64(1), r[0].Position)
	})

	t.Run("expects the write stream position", func(t *testing.T) {
		t.Run("successfully expects an empty stream then fails expecting it to be empty", func(t *testing.T) {
			stream := "Foo/" + uuid.NewString()

			_, err := s.Write([]AppendToStream{{
				Stream: stream,
				Condition: &AppendCondition{
					StreamIsEmpty: true,
				},
				Events: []Event{{
					EventId:   uuid.New().String(),
					EventType: "AnEventType",
					Payload:   []byte("{\"foo\": 123}"),
				}},
			}})
			assert.Nil(t, err)

			_, err = s.Write([]AppendToStream{{
				Stream: stream,
				Condition: &AppendCondition{
					StreamIsEmpty: true,
				},
				Events: []Event{{
					EventId:   uuid.New().String(),
					EventType: "AnEventType",
					Payload:   []byte("{\"foo\": 123}"),
				}},
			}})
			assert.NotNil(t, err)
		})

		t.Run("rejects invalid stream position", func(t *testing.T) {
			stream := "Foo/" + uuid.NewString()

			_, err := s.Write([]AppendToStream{{
				Stream: stream,
				Condition: &AppendCondition{
					WriteAtPosition: -1,
				},
				Events: []Event{{
					EventId:   uuid.New().String(),
					EventType: "AnEventType",
					Payload:   []byte("{\"foo\": 123}"),
				}},
			}})
			assert.NotNil(t, err)
		})

		t.Run("expects a specific stream version", func(t *testing.T) {
			stream := "Foo/" + uuid.NewString()
			_, err := s.Write(GenerateStreamWriteRequests(stream, 20))
			assert.Nil(t, err)

			// Writes an event at the expected position.
			_, err = s.Write([]AppendToStream{{
				Stream: stream,
				Condition: &AppendCondition{
					WriteAtPosition: 20,
				},
				Events: []Event{{
					EventId:   uuid.New().String(),
					EventType: "AnEventType",
					Payload:   []byte("{\"foo\": 123}"),
				}},
			}})

			assert.Nil(t, err)

			// Fails to write an event at the expected position.
			_, err = s.Write([]AppendToStream{{
				Stream: stream,
				Condition: &AppendCondition{
					WriteAtPosition: 20,
				},
				Events: []Event{{
					EventId:   uuid.New().String(),
					EventType: "AnEventType",
					Payload:   []byte("{\"foo\": 123}"),
				}},
			}})

			assert.NotNil(t, err)
		})
	})

	t.Run("only one of multiple concurrent writes succeeds", func(t *testing.T) {
		stream := "Foo/" + uuid.NewString()

		numberOfConcurrentRequests := 5
		resultChan := make(chan error, numberOfConcurrentRequests)

		for i := 0; i < numberOfConcurrentRequests; i++ {
			go func() {
				_, err := s.Write([]AppendToStream{{
					Stream: stream,
					Condition: &AppendCondition{
						WriteAtPosition: 0,
					},
					Events: []Event{{
						EventId:   uuid.New().String(),
						EventType: "AnEventType",
						Payload:   []byte("{\"foo\": 123}"),
					}},
				}})

				resultChan <- err
			}()
		}

		numberOfSuccesses := 0
		numberOfFailures := 0
		for i := 0; i < numberOfConcurrentRequests; i++ {
			err := <-resultChan

			if err != nil {
				numberOfFailures++
			} else {
				numberOfSuccesses++
			}
		}

		assert.Equal(t, 1, numberOfSuccesses)
		assert.Equal(t, numberOfConcurrentRequests-1, numberOfFailures)
	})

	t.Run("it can start a stream at a specific position", func(t *testing.T) {
		stream := "Foo/" + uuid.NewString()
		r, err := s.Write([]AppendToStream{
			{
				Stream: stream,
				Events: []Event{
					{EventId: uuid.NewString(), EventType: "Foo", Payload: []byte("foo")},
				},
				Condition: &AppendCondition{
					StreamIsEmpty:   true,
					WriteAtPosition: int64(4),
				},
			},
		})
		assert.Nil(t, err)
		assert.Equal(t, int64(4), r[0].Position)

		t.Run("subsequent writes will take the following positions", func(t *testing.T) {
			results, err := s.Write([]AppendToStream{
				{
					Stream: stream,
					Events: []Event{
						{EventId: uuid.NewString(), EventType: "Bar", Payload: []byte("bar")},
					},
				},
			})

			assert.Nil(t, err)
			assert.Equal(t, int64(5), results[0].Position)
		})
	})
}
