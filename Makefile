ifneq (,$(wildcard .env))
include .env
export
endif

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
