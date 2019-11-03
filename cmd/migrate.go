package main

import (
	"github.com/golang-migrate/migrate"
	"log"
	"os"

	_ "github.com/golang-migrate/migrate/database/postgres"
	_ "github.com/golang-migrate/migrate/source/file"
)

func main() {
	m, err := migrate.New(
		"file://postgres/migrations",
		os.Getenv("DATABASE_URL")+"?sslmode=disable",
	)
	if err != nil {
		log.Fatal(err)
	}
	if err := m.Up(); err != nil {
		log.Fatal(err)
	}
}
