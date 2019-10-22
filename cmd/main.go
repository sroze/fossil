package main

import (
	"github.com/sroze/fossil/http"
	"log"
)

func main() {
	err := http.StartServer()

	if err != nil {
		log.Fatal(err)
	}
}
