# Fossil (Go Writer)

## Run it!

1. Start a bootstrap node -- i.e. with a set port.
   ```
   go run main.go -port=10000
   ```

2. Start as many members needed from this discovery one.
   ```
   go run main.go -discover=localhost:10000
   ```

## Very high-level

- A control plane. 
  - Registers the nodes to the Raft group, etc...
- A number of writer nodes.
  - Take leadership for some of the shards we care about.
  - 

## Documentation

```
docker run -it --rm -v $(pwd)/docs:/var/model \
    ghcr.io/avisi-cloud/structurizr-site-generatr \
    generate-site -w workspace.dsl
```

## TODO, for the future

- Rolling updates: https://github.com/lni/dragonboat/issues/270#issuecomment-1430805371
