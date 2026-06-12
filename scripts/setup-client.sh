#!/usr/bin/env bash
# Setup script para novo cliente LocaCentral
# Pergunta: nome, cores, credenciais
# Gera .env configurado e instrui o deploy

set -e

echo "──────────────────────────────────────────────"
echo "  LocaCentral — Configuração de Novo Cliente"
echo "──────────────────────────────────────────────"
echo

read -rp "Nome da imobiliária (ex: Arthur Levy Imóveis): " BRAND_NAME
read -rp "Nome curto (ex: Arthur Levy): " BRAND_SHORT
read -rp "Cor primária em hex (ex: #006B3F): " BRAND_COLOR
BRAND_COLOR=${BRAND_COLOR:-#1B4FCC}
read -rp "Cor primária escura em hex (ex: #004D2C): " BRAND_DARK
BRAND_DARK=${BRAND_DARK:-#1340A8}
read -rp "E-mail do administrador: " ADMIN_EMAIL
read -rp "Domínio (ou deixe em branco para localhost): " APP_DOMAIN
APP_DOMAIN=${APP_DOMAIN:-localhost}
read -rp "Porta HTTP (padrão 8080): " APP_PORT
APP_PORT=${APP_PORT:-8080}
read -rp "E-mail SMTP (remetente): " SMTP_FROM
read -rp "Senha do app Gmail (ou deixe em branco): " GMAIL_PASS
read -rp "Client ID da Cora (sandbox, opcional): " CORA_ID
read -rp "Client Secret da Cora (opcional): " CORA_SECRET

ACCESS_SECRET=$(openssl rand -base64 24 2>/dev/null || cat /dev/urandom | tr -dc 'A-Za-z0-9' | head -c 32)
REFRESH_SECRET=$(openssl rand -base64 24 2>/dev/null || cat /dev/urandom | tr -dc 'A-Za-z0-9' | head -c 32)
RESET_SECRET=$(openssl rand -base64 24 2>/dev/null || cat /dev/urandom | tr -dc 'A-Za-z0-9' | head -c 32)
APPCREDZ_SECRET=$(openssl rand -base64 24 2>/dev/null || cat /dev/urandom | tr -dc 'A-Za-z0-9' | head -c 32)
CIPHER_KEY=$(openssl rand -base64 16 2>/dev/null || cat /dev/urandom | tr -dc 'A-Za-z0-9' | head -c 16)
CIPHER_IV=$(openssl rand -base64 12 2>/dev/null || cat /dev/urandom | tr -dc 'A-Za-z0-9' | head -c 12)
REDIS_PASS=$(openssl rand -base64 16 2>/dev/null || cat /dev/urandom | tr -dc 'A-Za-z0-9' | head -c 16)

cat > .env <<EOF
# Gerado pelo setup-client.sh
MRE_VERSION=latest
APP_PORT=${APP_PORT}
APP_DOMAIN=${APP_DOMAIN}

# White-label / Branding
NEXT_PUBLIC_BRAND_NAME=${BRAND_NAME}
NEXT_PUBLIC_BRAND_SHORT=${BRAND_SHORT}
NEXT_PUBLIC_BRAND_PRIMARY_COLOR=${BRAND_COLOR}
NEXT_PUBLIC_BRAND_PRIMARY_DARK=${BRAND_DARK}
NEXT_PUBLIC_LOGO_URL=/static/logo.png
NEXT_PUBLIC_FAVICON_URL=/static/favicon.ico

# E-mail
GMAIL_EMAIL=${SMTP_FROM}
GMAIL_APP_PASSWORD=${GMAIL_PASS}
EMAIL_FROM=${SMTP_FROM}
EMAIL_REPLY_TO=${SMTP_FROM}

# Cora (boletos)
CORA_CLIENT_ID=${CORA_ID}
CORA_CLIENT_SECRET=${CORA_SECRET}
CORA_ENVIRONMENT=sandbox

# Segredos (gerados automaticamente — NÃO compartilhar)
ACCESS_TOKEN_SECRET=${ACCESS_SECRET}
REFRESH_TOKEN_SECRET=${REFRESH_SECRET}
RESET_TOKEN_SECRET=${RESET_SECRET}
APPCREDZ_TOKEN_SECRET=${APPCREDZ_SECRET}
CIPHER_KEY=${CIPHER_KEY}
CIPHER_IV_KEY=${CIPHER_IV}
REDIS_PASSWORD=${REDIS_PASS}
EOF

echo
echo "✔ Arquivo .env gerado com sucesso!"
echo
echo "Próximos passos:"
echo "  1. docker compose up -d"
echo "  2. Acesse: http://${APP_DOMAIN}:${APP_PORT}/landlord"
echo "  3. Crie sua conta com o e-mail: ${ADMIN_EMAIL}"
echo "──────────────────────────────────────────────"
