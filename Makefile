ifneq (,$(wildcard .env))
include .env
export
endif

.PHONY: start-db up-db token reset kafka-up kafka-down produce

start-db:
	docker compose start postgres

up-db:
	docker compose up -d postgres

token:
	@node scripts/dev-token.mjs

reset:
	npm run migration:revert
	npm run migration:run
	npm run seed

kafka-up:
	docker compose up -d kafka kafka-init kafka-ui

kafka-down:
	docker compose stop kafka kafka-init kafka-ui

produce:
	npm run produce -- $(ARGS)
