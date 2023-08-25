package cmd

import (
	"fmt"
	"github.com/apple/foundationdb/bindings/go/src/fdb"
	"github.com/google/uuid"
	"github.com/spf13/cobra"
	"github.com/sroze/fossil/kv/foundationdb"
	"github.com/sroze/fossil/store"
	"os"
)

var storeId string

var rootCmd = &cobra.Command{
	Use:   "fossil",
	Short: "Fossil is an horizontally scalable event store",
}

func init() {
	rootCmd.PersistentFlags().StringVar(&storeId, "store-id", "00000000-0000-0000-0000-000000000000", "identifier of the store")
}

func Execute() {
	if err := rootCmd.Execute(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func getStore() *store.Store {
	fdb.MustAPIVersion(720)
	kv := foundationdb.NewStore(fdb.MustOpenDatabase("fdb.cluster"))
	s := store.NewStore(kv, uuid.MustParse(storeId))

	return s
}
