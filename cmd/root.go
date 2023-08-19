package cmd

import (
	"fmt"
	"github.com/apple/foundationdb/bindings/go/src/fdb"
	"github.com/google/uuid"
	"github.com/spf13/cobra"
	"github.com/sroze/fossil/api/server"
	"github.com/sroze/fossil/kv/foundationdb"
	"github.com/sroze/fossil/store"
	"github.com/sroze/fossil/store/segments"
	"github.com/sroze/fossil/store/topology"
	"os"
	"os/signal"
	"syscall"
)

var rootCmd = &cobra.Command{
	Use:   "fossil",
	Short: "Fossil is an horizontally scalable event store",
	Run: func(cmd *cobra.Command, args []string) {
		fdb.MustAPIVersion(720)
		kv := foundationdb.NewStore(fdb.MustOpenDatabase("fdb.cluster"))
		s := store.NewStore(kv, uuid.MustParse("9cb251e0-3e9b-11ee-91d0-d3914888dcd6"))
		err := s.Start()
		if err != nil {
			panic(err)
		}

		_, err = s.GetTopologyManager().GetSegmentToWriteInto("foo/bar")
		if err != nil {
			if _, isSegmentNotFound := err.(topology.NoSegmentToWriteIntoError); isSegmentNotFound {
				// By default, create a single segment to start with.
				_, err := s.GetTopologyManager().Create(segments.NewSegment(segments.NewPrefixRange("")))
				if err != nil {
					panic(err)
				}
			} else {
				panic(err)
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

func Execute() {
	if err := rootCmd.Execute(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
