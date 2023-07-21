package main

import (
	"bufio"
	"flag"
	"fmt"
	"github.com/google/uuid"
	"github.com/hashicorp/consul/api"
	"log"
	"os"
	"os/signal"
	"syscall"
)

var serviceName = "my-service"

func main() {
	// Define and parse command-line arguments
	var nodeName string
	var portNumber int
	var otherClusterNodes string
	flag.StringVar(&nodeName, "name", uuid.New().String(), "Name of the node")
	flag.IntVar(&portNumber, "port", 0, "Port number")
	flag.StringVar(&otherClusterNodes, "discover", "", "Comma-separated list of other cluster nodes")
	flag.Parse()

	// Create a Consul API client
	client, _ := api.NewClient(api.DefaultConfig())

	serviceAddress := "127.0.0.1"
	servicePort := portNumber

	// Create a new service instance
	agentId := fmt.Sprintf("%s-%s:%d", serviceName, serviceAddress, servicePort)
	service := &api.AgentServiceRegistration{
		ID:      agentId,
		Name:    serviceName,
		Address: serviceAddress,
		Port:    servicePort,
	}

	// Register the service with Consul
	err := client.Agent().ServiceRegister(service)
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

	err = client.Agent().ServiceDeregister(agentId)
	if err != nil {
		log.Println("Error deregistering service:", err)
		os.Exit(1)
	}
}
