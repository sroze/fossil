package storage

import (
	"github.com/cloudevents/sdk-go"
	"github.com/jackc/pgx"
	"strings"
)

type PostgresStorageTransaction struct {
	tx *pgx.Tx
}

func (t *PostgresStorageTransaction) Store(stream string, event cloudevents.Event) error {
	_, err := t.tx.Exec("insert into events (id, stream, event) values ($1, $2, $3)", event.Context.GetID(), stream, event.Data)

	if err != nil {
		if strings.Contains(err.Error(), "SQLSTATE 23505") {
			return &DuplicateEventError{}
		}
	}

	return err
}

func (t *PostgresStorageTransaction) Commit() error {
	return t.tx.Commit()
}

func (t *PostgresStorageTransaction) Rollback() error {
	return t.tx.Rollback()
}

type PostgresStorage struct {
	conn *pgx.Conn
}

func NewPostgresStorage (url string) (*PostgresStorage, error) {
	config, err := pgx.ParseConnectionString(url)
	if err != nil {
		return nil, err
	}

	conn, err := pgx.Connect(config)
	if err != nil {
		return nil, err
	}

	return &PostgresStorage{
		conn,
	}, nil
}

func (s *PostgresStorage) NewTransaction() (EventStoreTransaction, error) {
	tx, err := s.conn.Begin()
	if err != nil {
		return nil, err
	}

	return &PostgresStorageTransaction{ tx }, nil
}
