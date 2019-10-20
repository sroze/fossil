package postgres

import (
	"github.com/jackc/pgx"
)

func NewPostgresConnection(url string) (*pgx.Conn, error) {
	config, err := pgx.ParseConnectionString(url)
	if err != nil {
		return nil, err
	}

	return pgx.Connect(config)
}

func NewPostgresPool(url string) (*pgx.ConnPool, error) {
	config, err := pgx.ParseConnectionString(url)
	if err != nil {
		return nil, err
	}

	return pgx.NewConnPool(pgx.ConnPoolConfig{
		ConnConfig: config,
	})
}
