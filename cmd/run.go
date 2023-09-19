package cmd

import (
	"fmt"
	"github.com/spf13/cobra"
	"github.com/sroze/fossil/api/server"
	"github.com/sroze/fossil/store/segments"
	"github.com/sroze/fossil/store/topology"
	"os"
	"os/signal"
	"syscall"
)

var automatedInit bool

var runCmd = &cobra.Command{
	Use:   "run",
	Short: "Run the Fossil server",
	Run: func(cmd *cobra.Command, args []string) {
		s := getStore()
		err := s.Start()
		if err != nil {
			panic(err)
		}

		// If we accept an automated initialisation for easy of use.
		if automatedInit {
			_, err = s.GetTopologyManager().GetSegmentToWriteInto("foo/bar")
			if err != nil {
				if _, isSegmentNotFound := err.(topology.NoSegmentToWriteIntoError); isSegmentNotFound {
					fmt.Println("Store was found, but no segment was found to write into. Creating a new one.")

					// By default, create a single segment to start with.
					s, err := s.GetTopologyManager().Create(segments.NewSegment(segments.NewPrefixRange("")))
					if err != nil {
						panic(err)
					}

					fmt.Printf("Segment #%s created.\n", s.Id)
				} else {
					panic(err)
				}
			}
		}

		err, server, a := server.NewServer(s, 8001)
		if err != nil {
			panic(err)
		}

		defer server.Stop()
		fmt.Printf("server listening at %v", a)

		stop := make(chan os.Signal, 1)
		signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
		<-stop
	},
}

func init() {
	runCmd.Flags().BoolVar(&automatedInit, "automated-init", true, "automatically initialize the store if it does not exist")

	rootCmd.AddCommand(runCmd)
}
