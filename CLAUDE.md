# LocaCentral — Guia do Agente

## O que é esse projeto

LocaCentral é um sistema de gestão de locação imobiliária residencial brasileiro, construído em cima do MicroRealEstate (licença MIT). O objetivo é substituir sistemas como o Unilocweb com uma solução self-hosted que pode ser instalada na VPS do cliente.

O primeiro cliente é **Arthur Levy Imóveis** (Suzano/SP). O sistema foi construído de forma white-label: trocar logo, cores e nome da empresa não deve exigir mudança de código.

## Arquitetura base (MicroRealEstate)

O projeto original usa:
- **Backend**: Node.js + Express, arquitetura de microsserviços
- **Banco**: MongoDB + Mongoose
- **Frontend**: Next.js 14 + React 18 + Tailwind CSS
- **PDF**: Puppeteer/Chromium (serviço `pdfgenerator`)
- **Auth**: JWT (locadora) + OTP por email (inquilino)
- **Deploy**: Docker Compose

Serviços existentes:
- `services/api` — API principal
- `services/pdfgenerator` — geração de PDF com Puppeteer
- `services/emailer` — envio de emails
- `services/authenticator` — auth JWT/OTP
- `webapps/landlord` — frontend da locadora (Next.js)
- `webapps/tenant` — portal do inquilino (Next.js)

## O que foi adicionado/modificado no LocaCentral

> Atualizar esta seção conforme novas features forem implementadas.

### Novos modelos (MongoDB)
- `Owner` — proprietário do imóvel (locador), separado do User/Agency
- `Guarantee` — garantias do contrato (fiador, caução, seguro fiança, título capitalização)
- `ContractParty` — partes do contrato com CPF/CNPJ, RG, estado civil
- `MonthlyCharge` — cobranças mensais com itens (aluguel, IPTU, condomínio, água, luz, multas)
- `IndexAdjustment` — histórico de reajustes por índice (IGPM, IPCA, INCC)
- `InspectionReport` — vistoria de entrada/saída
- `TerminationNotice` — rescisão contratual

### Extensões nos modelos existentes
- `Occupant` (inquilino): adicionado CPF, RG, estado civil, profissão, nacionalidade
- `Property`: adicionado registro de imóvel, IPTU, tipo (casa/apto/comercial/terreno)
- `Lease` (contrato): adicionado tipo (determinado/indeterminado), índice de reajuste, garantia, multa rescisória

### Novos serviços/módulos
- `services/api/src/managers/owner.js` — CRUD de proprietários
- `services/api/src/managers/guarantee.js` — gestão de garantias
- `services/api/src/managers/monthlybilling.js` — engine de cobranças mensais
- `services/api/src/managers/indexadjustment.js` — reajuste por índice com cron job
- `services/api/src/integrations/cora.js` — integração boleto via API Cora

### White-label
- Configurações de marca em `config/branding.js` (nome, logo, cores primárias)
- Frontend lê `NEXT_PUBLIC_BRAND_*` do `.env` para nome e cores
- Logo substituível via variável de ambiente `NEXT_PUBLIC_LOGO_URL`

## Regras de negócio brasileiras (Lei do Inquilinato 8.245/91)

### Multa rescisória (art. 4º)
```
multa = (meses_restantes / meses_totais) × 3 × valor_aluguel
```
Proporcional ao tempo restante. Máximo de 3 meses de aluguel.

### Reajuste anual
- Aplicado uma vez por ano na data aniversário do contrato
- Índices suportados: IGPM, IPCA, INCC, IVAR, IGP-DI
- Fonte dos índices: API do IBGE (IPCA/INCC) e FGV (IGPM/IGP-DI)
- Cron job roda diariamente verificando contratos com aniversário no dia

### Aviso de rescisão
- Inquilino deve avisar com 30 dias de antecedência (art. 46)
- Contratos com mais de 30 meses: proprietário avisa com 90 dias (art. 46 §2)

### Garantias permitidas (art. 37)
1. Fiador — pessoa física com imóvel quitado na mesma cidade
2. Caução — depósito de até 3 meses de aluguel
3. Seguro fiança — apólice de seguro
4. Título de capitalização — título vinculado ao contrato

## Convenções de código

### Backend (Node.js)
- Seguir padrão dos managers existentes em `services/api/src/managers/`
- Sempre usar `realmId` nos queries (multi-tenancy)
- Validação de entrada com Joi (padrão do projeto)
- Erros retornam `{ status, message }` consistente

### Frontend (Next.js/React)
- Componentes em `webapps/landlord/src/components/`
- Seguir padrão visual existente: Tailwind + Radix UI
- Textos sempre em pt-BR
- Datas no formato brasileiro (dd/mm/aaaa)
- Valores monetários: `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`

### White-label
- NUNCA hardcodar nome "LocaCentral" ou "Arthur Levy" no código
- Sempre usar variáveis de `config/branding.js` ou env vars `NEXT_PUBLIC_BRAND_*`
- Cores primárias via CSS variables: `--color-primary`, `--color-primary-dark`

### Banco de dados
- Todo novo modelo deve ter campo `realmId` (ObjectId, required) para multi-tenancy
- Timestamps (`createdAt`, `updatedAt`) em todos os modelos
- Nunca deletar registros — usar campo `archived: Boolean` ou `status`

## O que NÃO mexer

- Sistema de autenticação JWT/OTP (`services/authenticator`) — funciona, não tocar
- Infraestrutura Docker Compose — só adicionar serviços, não modificar os existentes
- Sistema de email (`services/emailer`) — só adicionar templates, não modificar o core
- Estrutura de workspaces Yarn — não alterar `package.json` raiz

## Integração Cora (boletos)

Documentação: https://developers.cora.com.br
- Autenticação: OAuth2 client credentials
- Endpoint boleto: `POST /v2/invoices`
- Webhook confirmação pagamento: configurar em `services/api/src/routes/webhooks/cora.js`
- Credenciais via env: `CORA_CLIENT_ID`, `CORA_CLIENT_SECRET`, `CORA_ENVIRONMENT` (sandbox/production)

## Estrutura de pastas do que foi adicionado

```
locacentral/
├── CLAUDE.md              ← este arquivo
├── TASKS.md               ← tarefas do projeto
├── ARCHITECTURE.md        ← arquitetura detalhada
├── config/
│   └── branding.js        ← configurações white-label
├── services/
│   └── api/
│       └── src/
│           ├── managers/
│           │   ├── owner.js
│           │   ├── guarantee.js
│           │   ├── monthlybilling.js
│           │   └── indexadjustment.js
│           ├── models/
│           │   ├── owner.js
│           │   ├── guarantee.js
│           │   ├── monthlycharge.js
│           │   ├── indexadjustment.js
│           │   ├── inspectionreport.js
│           │   └── terminationnotice.js
│           └── integrations/
│               └── cora.js
└── webapps/
    └── landlord/
        └── src/
            └── components/
                ├── owners/
                ├── contracts-br/
                └── billing/
