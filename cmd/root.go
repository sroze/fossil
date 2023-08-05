package cmd

import (
	"fmt"
	"github.com/spf13/cobra"
	"os"
)

var rootCmd = &cobra.Command{
	Use:   "fossil",
	Short: "Fossil is an horizontally scalable event store",
	Run: func(cmd *cobra.Command, args []string) {
		fmt.Println("Yay!")
	},
}

func Execute() {
	if err := rootCmd.Execute(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
