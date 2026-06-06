.PHONY: help deploy-worker deploy-web deploy-all

# Tampilkan bantuan
help:
	@echo "Omnidrive Deployment Commands"
	@echo "-----------------------------"
	@echo "make deploy-worker  - Deploy Cloudflare Worker (Backend)"
	@echo "make deploy-web     - Build & Deploy Cloudflare Pages (Frontend)"
	@echo "make deploy-all     - Deploy Backend & Frontend sekaligus"

# Deploy Backend
deploy-worker:
	@echo "=> Deploying Worker (Backend)..."
	cd packages/worker && npx wrangler deploy

# Deploy Frontend
deploy-web:
	@echo "=> Building & Deploying Web (Frontend)..."
	@echo "Pastikan packages/web/.env.production sudah berisi VITE_API_URL yang benar."
	cd packages/web && npx vite build && npx wrangler pages deploy dist/

# Deploy Keduanya
deploy-all: deploy-worker deploy-web
	@echo "=> Berhasil deploy keseluruhan aplikasi!"
