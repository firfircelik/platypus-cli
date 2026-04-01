# Contributing to Platypus

Thanks for your interest in contributing!

## Getting Started

```bash
git clone https://github.com/firfircelik/platypus-cli.git
cd platypus-cli
make build
```

## Development

```bash
make build    # Build binary
make test     # Run tests
make lint     # Run linter
make fmt      # Format code
make check    # Run all checks (fmt, vet, lint, test)
```

## Pull Requests

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Make your changes
4. Run `make check` to verify
5. Commit with a clear message
6. Push and open a PR

## Code Style

- Follow standard Go conventions (`gofmt`, `go vet`)
- No comments unless necessary
- Keep functions small and focused
- Add tests for new functionality

## Issues

- Use GitHub Issues for bugs and feature requests
- Include steps to reproduce for bugs
- Include Go version and OS info

## License

By contributing, you agree your code will be licensed under the MIT License.
