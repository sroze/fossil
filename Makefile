docs:
	docker run -it --rm -v $(shell pwd)/docs:/var/model ghcr.io/avisi-cloud/structurizr-site-generatr generate-site -w workspace.dsl

proto:
	protoc --go_out=. --go_opt=paths=source_relative \
        --go-grpc_out=. --go-grpc_opt=paths=source_relative \
        api/v1/store.proto

#	protoc --go_out=. --go_opt=paths=source_relative \
#		api/index/events.proto

.PHONY: docs
