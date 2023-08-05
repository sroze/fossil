package main

//import (
//	"flag"
//	"fmt"
//	"github.com/apple/foundationdb/bindings/go/src/fdb"
//	"github.com/sroze/fossil/store/api"
//	"log"
//	"os"
//	"os/signal"
//	"syscall"
//)
//
//func main() {
//	fdb.MustAPIVersion(720)
//
//	// Define and parse command-line arguments
//	var portNumber int
//	flag.IntVar(&portNumber, "port", 0, "Port number")
//	flag.Parse()
//
//	err, server, _ := api.NewServer(fdb.MustOpenDatabase("fdb.cluster"), portNumber)
//	if err != nil {
//		log.Fatal(err)
//	} else {
//		defer server.Stop()
//	}
//
//	stop := make(chan os.Signal, 1)
//	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
//	<-stop
//
//	fmt.Println("\nReceived termination signal, shutting down...")
//}

import (
	"github.com/sroze/fossil/cmd"
)

func main() {
	cmd.Execute()
}
