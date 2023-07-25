package main

import (
	"bufio"
	"flag"
	"fmt"
	"github.com/apple/foundationdb/bindings/go/src/fdb"
	"github.com/sroze/fossil/store/api"
	"log"
	"os"
	"os/signal"
	"strings"
	"syscall"
)

func main() {
	fdb.MustAPIVersion(720)

	// Define and parse command-line arguments
	var portNumber int
	flag.IntVar(&portNumber, "port", 0, "Port number")
	flag.Parse()

	err, server, _ := api.NewServer(fdb.MustOpenDatabase("fdb.cluster"), portNumber)
	if err != nil {
		log.Fatal(err)
	} else {
		defer server.Stop()
	}

	// Start a goroutine to listen for CLI commands
	go func() {
		scanner := bufio.NewScanner(os.Stdin)
		for scanner.Scan() {
			cmd := scanner.Text()
			if cmd == "list" {

			} else if strings.HasPrefix(cmd, "hello ") {

			}
		}
		if err := scanner.Err(); err != nil {
			log.Println("Error reading standard input:", err)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop

	fmt.Println("\nReceived termination signal, shutting down...")
}
