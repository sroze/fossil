package cmd

import (
	"github.com/golang-migrate/migrate"
	"github.com/spf13/cobra"
	"log"
	"os"

	_ "github.com/golang-migrate/migrate/database/postgres"
	_ "github.com/golang-migrate/migrate/source/file"
)

var migrateCmd = &cobra.Command{
	Use:   "migrate",
	Short: "Run the required database migrations.",
	Run: func(cmd *cobra.Command, args []string) {
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
	},
}

func init() {
	rootCmd.AddCommand(migrateCmd)
}
