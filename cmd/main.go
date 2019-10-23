package main

import (
	"github.com/sroze/fossil"
	"log"
)

func main() {
	err := fossil.StartServer()

	if err != nil {
		log.Fatal(err)
	}
}
