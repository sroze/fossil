package main

import (
	"bufio"
	"flag"
	"fmt"
	"github.com/google/uuid"
	"github.com/hashicorp/memberlist"
	"log"
	"net"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"
)

// Define a delegate to receive events about cluster changes
type delegate struct{}

// NotifyJoin is invoked when a node is detected to have joined.
// The Node argument must not be modified.
func (d *delegate) NotifyJoin(n *memberlist.Node) {
	fmt.Printf("A new node has joined: %s\n", n.Name)
}

// NotifyLeave is invoked when a node is detected to have left.
// The Node argument must not be modified.
func (d *delegate) NotifyLeave(n *memberlist.Node) {
	fmt.Printf("A node has left: %s\n", n.Name)
}

// NotifyUpdate is invoked when a node is detected to have updated, usually involving its meta data.
// The Node argument must not be modified.
func (d *delegate) NotifyUpdate(n *memberlist.Node) {
	fmt.Printf("A node has updated: %s\n", n.Name)
}

func main() {
	// Define and parse command-line arguments
	var nodeName string
	var portNumber int
	var otherClusterNodes string
	flag.StringVar(&nodeName, "name", uuid.New().String(), "Name of the node")
	flag.IntVar(&portNumber, "port", 0, "Port number")
	flag.StringVar(&otherClusterNodes, "discover", "", "Comma-separated list of other cluster nodes")
	flag.Parse()

	// Create a new node
	m, err := newMember(nodeName, portNumber)
	if err != nil {
		log.Fatal("Failed to create member: ", err)
	}

	// Join cluster if nodes were specified
	if otherClusterNodes != "" {
		_, err := m.Join(strings.Split(otherClusterNodes, ","))
		if err != nil {
			log.Fatal("Failed to join cluster: ", err)
		}
	}

	// Start a goroutine to listen for the "list" command
	go func() {
		scanner := bufio.NewScanner(os.Stdin)
		for scanner.Scan() {
			cmd := scanner.Text()
			if cmd == "list" {
				// Print members of the cluster
				for _, member := range m.Members() {
					fmt.Printf("Member: %s %s:%d\n", member.Name, member.Addr, member.Port)
				}
			}
		}
		if err := scanner.Err(); err != nil {
			log.Println("Error reading standard input:", err)
		}
	}()

	// Handle SIGTERM
	go func() {
		sigterm := make(chan os.Signal, 1)
		signal.Notify(sigterm, syscall.SIGINT, syscall.SIGTERM)
		<-sigterm // Block until we receive a SIGTERM signal

		fmt.Println("\nReceived termination signal, leaving cluster and shutting down...")
		m.Leave(1 * time.Second) // Immediate leave
		if err := m.Shutdown(); err != nil {
			fmt.Println(err)
			os.Exit(1)
		}

		os.Exit(0)
	}()

	// Don't shut down immediately
	select {}
}

func newMember(name string, port int) (*memberlist.Memberlist, error) {
	listConfig := memberlist.DefaultLocalConfig()
	listConfig.Name = name
	listConfig.Events = &delegate{}

	listConfig.BindPort = port
	listConfig.AdvertisePort = listConfig.BindPort

	listConfig.BindAddr = "127.0.0.1"
	listConfig.AdvertiseAddr = listConfig.BindAddr

	// Create a new member
	list, err := memberlist.Create(listConfig)
	if err != nil {
		return nil, err
	}

	// Assign a unique address to this member
	addr, err := net.ResolveTCPAddr("tcp", listConfig.BindAddr+":"+fmt.Sprint(listConfig.BindPort))
	if err != nil {
		return nil, err
	}

	listConfig.BindAddr = addr.IP.String()
	listConfig.BindPort = addr.Port

	return list, nil
}
