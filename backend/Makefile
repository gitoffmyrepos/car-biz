# FX Weekly Lease Backend Makefile

.PHONY: lint lint-fix test

# Run linting
lint:
	python -m ruff check app/ --config ruff.toml

# Run linting with auto-fix
lint-fix:
	python -m ruff check app/ --config ruff.toml --fix

# Run tests
test:
	python -m pytest tests/ -v
