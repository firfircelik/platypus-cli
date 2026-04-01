.PHONY: build test lint fmt vet run clean

BINARY_NAME := platypus
VERSION := $(shell git describe --tags --always --dirty 2>/dev/null || echo "dev")
LDFLAGS := -s -w -X github.com/firfircelik/platypus-cli/pkg/platypus.Version=$(VERSION)

build:
	go build -ldflags "$(LDFLAGS)" -o $(BINARY_NAME) ./cmd/platypus

test:
	go test -race -count=1 ./...

lint:
	golangci-lint run ./...

fmt:
	gofmt -w .
	goimports -w . 2>/dev/null || true

vet:
	go vet ./...

run: build
	./$(BINARY_NAME) -t

clean:
	rm -f $(BINARY_NAME)
	go clean

check: fmt vet lint test
