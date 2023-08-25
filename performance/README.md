# Performance testing

## Setup

```
brew install k6
```

## Run

1. Run Fossil (`go run main.go -port 8080` locally)
2. `k6 run writes.js`

## Running Fossil with multiple segments

Split existing segments:
```
go run main.go --store-id=00000000-0000-0000-0000-000000000001 segment-split 397304fe-0dae-4f47-ba20-4d35ae9ee0f0 16
```
