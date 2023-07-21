docs:
	docker run -it --rm -v $(shell pwd)/docs:/var/model ghcr.io/avisi-cloud/structurizr-site-generatr generate-site -w workspace.dsl

.PHONY: docs
