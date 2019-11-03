package cmd

import (
	"github.com/spf13/cobra"
	"github.com/sroze/fossil/server"
	"log"
)

var serverCmd = &cobra.Command{
	Use:   "server",
	Short: "Run Fossil server.",
	Run: func(cmd *cobra.Command, args []string) {
		err := server.StartServer()

		if err != nil {
			log.Fatal(err)
		}
	},
}

func init() {
	rootCmd.AddCommand(serverCmd)
}
