package fossil

import (
	"log"
)

func main() {
	err := StartServer()

	if err != nil {
		log.Fatal(err)
	}
}
