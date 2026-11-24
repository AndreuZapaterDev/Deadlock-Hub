.PHONY: dev test e2e preview lint typecheck build install

dev:
	docker compose up app

test:
	docker compose run --rm test

e2e:
	docker compose run --rm e2e

preview:
	docker compose up --build preview

lint:
	docker compose run --rm app npm run lint

typecheck:
	docker compose run --rm app npm run typecheck

build:
	docker compose run --rm app npm run build

# uso: make install p="zod recharts"
install:
	docker compose run --rm app npm install $(p)
