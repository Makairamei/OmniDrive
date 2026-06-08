.PHONY: help deploy-worker deploy-web deploy-all db-migrate-local db-migrate-remote

# Tampilkan bantuan
help:
	@echo "Omnidrive Deployment Commands"
	@echo "-----------------------------"
	@echo "make deploy-worker     - Deploy Cloudflare Worker (Backend)"
	@echo "make deploy-web        - Build & Deploy Cloudflare Pages (Frontend)"
	@echo "make deploy-all        - Deploy Backend & Frontend sekaligus"
	@echo "make db-migrate-local  - Migrate local D1 Database"
	@echo "make db-migrate-remote - Migrate remote D1 Database"

# Deploy Backend
deploy-worker:
	@echo "=> Deploying Worker (Backend)..."
	cd packages/worker && npx wrangler deploy

# Deploy Frontend
deploy-web:
	@echo "=> Building & Deploying Web (Frontend)..."
	@echo "Pastikan packages/web/.env.production sudah berisi VITE_API_URL yang benar."
	cd packages/web && npx vite build && npx wrangler pages deploy dist/ --project-name omnidrive --branch main

# Deploy Keduanya
deploy-all: deploy-worker deploy-web
	@echo "=> Berhasil deploy keseluruhan aplikasi!"

# Migrate DB Local
db-migrate-local:
	@echo "=> Migrating Local D1 Database..."
	cd packages/worker && npm run db:migrate:local

# Migrate DB Remote
db-migrate-remote:
	@echo "=> Migrating Remote D1 Database..."
	cd packages/worker && npm run db:migrate:remote
