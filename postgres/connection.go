package postgres

import "github.com/jackc/pgx"

func NewPostgresConnection(url string) (*pgx.Conn, error) {
	config, err := pgx.ParseConnectionString(url)
	if err != nil {
		return nil, err
	}

	return pgx.Connect(config)
}
