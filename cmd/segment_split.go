package cmd

import (
	"fmt"
	"github.com/spf13/cobra"
	"strconv"
)

var segmentSplitCmd = &cobra.Command{
	Use:   "segment-split [segment] [chunk-count]",
	Short: "Split a given segment into chunks",
	Args:  cobra.MatchAll(cobra.ExactArgs(2), cobra.OnlyValidArgs),
	Run: func(cmd *cobra.Command, args []string) {
		// parse chunk count into int:
		chunkCount, err := strconv.Atoi(args[1])
		if err != nil {
			panic(err)
		}

		store := getStore()
		err = store.Start()
		if err != nil {
			panic(err)
		}

		defer store.Stop()

		segments, err := store.GetTopologyManager().Split(args[0], chunkCount)
		if err != nil {
			panic(err)
		}

		for _, segment := range segments {
			fmt.Printf("Created segment #%s\n", segment.Id)
		}
	},
}

func init() {
	rootCmd.AddCommand(segmentSplitCmd)
}
