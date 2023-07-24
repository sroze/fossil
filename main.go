package main

import (
	"bufio"
	"context"
	"flag"
	"fmt"
	"github.com/google/uuid"
	"github.com/hashicorp/consul/api"
	v1 "github.com/sroze/fossil/writer/api/v1"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	"log"
	"net"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"
)

var serviceName = "my-service"

func main() {
	// Define and parse command-line arguments
	var nodeName string
	var portNumber int
	flag.StringVar(&nodeName, "name", uuid.New().String(), "Name of the node")
	flag.IntVar(&portNumber, "port", 0, "Port number")
	flag.Parse()

	lis, err := net.Listen("tcp", fmt.Sprintf(":%d", portNumber))
	if err != nil {
		log.Fatalf("failed to listen: %v", err)
	}

	addr := lis.Addr().(*net.TCPAddr)
	s := grpc.NewServer()
	v1.RegisterWriterServer(s, &Server{})

	// Start the GRPC API in the background.
	go func() {
		log.Printf("server listening at %v", addr)
		if err := s.Serve(lis); err != nil {
			log.Fatalf("failed to serve: %v", err)
		}
	}()

	// Create a Consul API client
	client, _ := api.NewClient(api.DefaultConfig())

	// Create a new service instance
	service := &api.AgentServiceRegistration{
		ID:      nodeName,
		Name:    serviceName,
		Address: "127.0.0.1",
		Port:    addr.Port,
	}

	// Register the service with Consul
	err = client.Agent().ServiceRegister(service)
	if err != nil {
		panic(err)
	}

	// Start a goroutine to listen for CLI commands
	go func() {
		scanner := bufio.NewScanner(os.Stdin)
		for scanner.Scan() {
			cmd := scanner.Text()
			if cmd == "list" {
				// Print members of the cluster
				agents, _, err := client.Health().Service(serviceName, "", true, nil)
				if err != nil {
					panic(err)
				}

				// Print details of all agent instances
				for _, agent := range agents {
					fmt.Printf("Agent ID: %s\n", agent.Service.ID)
					fmt.Printf("Agent Address: %s\n", agent.Service.Address)
					fmt.Printf("Agent Port: %d\n", agent.Service.Port)
					fmt.Println("-----")
				}
			} else if strings.HasPrefix(cmd, "hello ") {
				conn, err := grpc.Dial(cmd[6:], grpc.WithTransportCredentials(insecure.NewCredentials()))
				if err != nil {
					log.Fatalf("did not connect: %v", err)
				}
				c := v1.NewWriterClient(conn)

				// Contact the server and print out its response.
				ctx, cancel := context.WithTimeout(context.Background(), time.Second)
				defer cancel()
				r, err := c.SayHello(ctx, &v1.HelloRequest{Name: "hardcoded for now"})
				if err != nil {
					log.Fatalf("could not greet: %v", err)
				} else {
					log.Printf("Greeting: %s", r.GetMessage())
				}

				conn.Close()
			}
		}
		if err := scanner.Err(); err != nil {
			log.Println("Error reading standard input:", err)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop

	fmt.Println("\nReceived termination signal, leaving cluster and shutting down...")

	err = client.Agent().ServiceDeregister(nodeName)
	if err != nil {
		log.Println("Error deregistering service:", err)
		os.Exit(1)
	}

	s.Stop()
}
