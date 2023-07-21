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

## Documentation

1. Build the docs
   ```
   make docs
   ```

2. Open the website in your browser (in `docs/build/site/index.html`).

## TODO, for the future

- Rolling updates: https://github.com/lni/dragonboat/issues/270#issuecomment-1430805371
