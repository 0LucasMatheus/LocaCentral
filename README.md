# LocaCentral

Sistema de gestão de locação imobiliária residencial para o mercado brasileiro, construído sobre o [MicroRealEstate](https://github.com/microrealestate/microrealestate) (licença MIT) e adaptado para atender à **Lei do Inquilinato (Lei 8.245/91)**.

Desenvolvido para imobiliárias e administradoras de imóveis que precisam de uma solução self-hosted — sem mensalidade de SaaS, instalado na própria VPS do cliente.

---

## Funcionalidades

- **Gestão de contratos** — contratos por prazo determinado e indeterminado, com índice de reajuste (IGPM, IPCA, INCC, IVAR, IGP-DI) e multa rescisória proporcional conforme art. 4º da Lei 8.245/91
- **Cobranças mensais** — emissão de boletos via integração com a Cora, registro de pagamentos e controle de inadimplência
- **Reajuste anual automático** — cron job que identifica contratos com aniversário no dia e notifica a locadora para aplicar o reajuste
- **Garantias locatícias** — suporte aos 4 tipos do art. 37: fiador, caução, seguro fiança e título de capitalização
- **Proprietários e imóveis** — cadastro completo com dados bancários, chave Pix e extrato de repasses
- **Geração de documentos PDF** — templates de contrato customizáveis com variáveis dinâmicas
- **Portal do inquilino** — acesso via OTP por e-mail para visualizar cobranças e baixar boletos
- **Multi-empresa (multi-tenant)** — uma instalação, múltiplas imobiliárias isoladas
- **White-label** — logo, cores e nome da empresa configuráveis por variável de ambiente, sem alterar código

---

## Pré-requisitos

- [Docker](https://docs.docker.com/engine/install/) instalado
- [Docker Compose](https://docs.docker.com/compose/install/) v2+

---

## Instalação

### 1. Clonar o repositório

```shell
git clone https://github.com/0LucasMatheus/LocaCentral.git
cd LocaCentral
```

### 2. Configurar o ambiente

```shell
cp .env.domain .env
```

Edite o `.env` com os dados do cliente: credenciais de e-mail (Gmail, Mailgun ou SMTP), secrets JWT e configurações da marca.

> **Importante:** os secrets e tokens gerados na primeira instalação devem ser preservados. Se forem perdidos, não será possível fazer login nem descriptografar dados existentes.

### 3. Subir os serviços

```shell
docker-compose up -d
```

O painel da locadora estará disponível em **http://localhost:8080/landlord**
O portal do inquilino em **http://localhost:8080/tenant**

---

## Deploy em VPS

### IP fixo

```shell
sudo APP_DOMAIN=x.x.x.x docker-compose up -d
```

### Domínio com HTTPS (SSL automático via Caddy)

```shell
sudo APP_DOMAIN=app.exemplo.com.br APP_PROTOCOL=https docker-compose --profile production up -d
```

Aponte o DNS do domínio para o IP da VPS. O certificado SSL é emitido automaticamente.

---

## Backup e restauração

Os comandos abaixo podem ser executados com a aplicação rodando.

### Backup

```shell
docker-compose run mongo /usr/bin/mongodump \
  --uri=mongodb://mongo/mredb \
  --gzip \
  --archive=./backup/mredb-$(date +%F_%T).dump
```

### Restaurar

```shell
docker-compose run mongo /usr/bin/mongorestore \
  --uri=mongodb://mongo/mredb \
  --drop --gzip \
  --archive=./backup/mredb-XXXX.dump
```

Substitua `mredb` pelo nome do banco configurado no `.env` (padrão: `mredb`).

---

## White-label

Para configurar a identidade visual do cliente, defina no `.env`:

```env
NEXT_PUBLIC_BRAND_NAME=Arthur Levy Imóveis
NEXT_PUBLIC_BRAND_SHORT=Arthur Levy
NEXT_PUBLIC_BRAND_PRIMARY_COLOR=#006B3F
NEXT_PUBLIC_BRAND_PRIMARY_DARK=#004D2C
NEXT_PUBLIC_LOGO_URL=/static/logo.png
```

---

## Desenvolvimento

Consulte [`ARCHITECTURE.md`](./ARCHITECTURE.md) para entender a arquitetura de serviços e os modelos de dados.
O backlog completo de tarefas está em [`TASKS.md`](./TASKS.md).

---

## Licença

Distribuído sob a licença MIT — veja [`LICENSE`](./LICENSE) para detalhes.

Este projeto é um fork do [MicroRealEstate](https://github.com/microrealestate/microrealestate), mantido por [Camel Aissani](https://github.com/camelaissani), ao qual agradecemos pelo trabalho open-source.
