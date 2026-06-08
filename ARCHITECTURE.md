# LocaCentral — Arquitetura

## Visão geral

```
┌─────────────────────────────────────────────────────────┐
│                     Docker Compose                       │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │   landlord   │  │    tenant    │  │  pdfgenerator │  │
│  │  (Next.js)   │  │  (Next.js)   │  │  (Puppeteer)  │  │
│  │  :8080/land  │  │  :8080/ten   │  │               │  │
│  └──────┬───────┘  └──────┬───────┘  └───────┬───────┘  │
│         │                 │                  │           │
│  ┌──────▼─────────────────▼──────────────────▼───────┐   │
│  │                   API Gateway                      │   │
│  │              services/api (Express)                │   │
│  └──────────────────────┬─────────────────────────────┘  │
│                         │                                 │
│  ┌──────────────┐  ┌────▼─────────┐  ┌───────────────┐  │
│  │ authenticator│  │   MongoDB    │  │    emailer    │  │
│  │  (JWT/OTP)   │  │   + Redis    │  │  (Nodemailer) │  │
│  └──────────────┘  └──────────────┘  └───────────────┘  │
└─────────────────────────────────────────────────────────┘
                           │
              ┌────────────▼────────────┐
              │    APIs Externas         │
              │  - Cora (boletos)        │
              │  - IBGE (índices IPCA)   │
              │  - FGV (índices IGPM)    │
              │  - ViaCEP (endereços)    │
              └─────────────────────────┘
```

## Entidades do domínio

### Hierarquia principal
```
Realm (locadora/imobiliária)
  └── Owner (proprietário)
        └── Property (imóvel)
              └── Lease/Contract (contrato)
                    ├── Occupant (inquilino)
                    ├── Guarantee (garantia)
                    ├── MonthlyCharge (cobrança mensal)
                    │     └── Boleto (via Cora)
                    ├── IndexAdjustment (reajuste)
                    ├── InspectionReport (vistoria)
                    └── TerminationNotice (rescisão)
```

### Modelos existentes no MicroRealEstate (aproveitados)
| Modelo | Arquivo | Status |
|--------|---------|--------|
| Realm | services/api/src/models/realm.js | ✅ Usar como está |
| Occupant | services/api/src/models/occupant.js | 🔧 Estender com CPF/RG/estado civil |
| Property | services/api/src/models/property.js | 🔧 Estender com IPTU/registro |
| Lease | services/api/src/models/lease.js | 🔧 Estender com índice/garantia/multa |
| Document | services/api/src/models/document.js | ✅ Usar para templates de contrato |
| Email | services/api/src/models/email.js | ✅ Usar como está |

### Modelos novos a criar
| Modelo | Arquivo | Descrição |
|--------|---------|-----------|
| Owner | services/api/src/models/owner.js | Proprietário/locador |
| Guarantee | services/api/src/models/guarantee.js | Garantia do contrato |
| MonthlyCharge | services/api/src/models/monthlycharge.js | Cobrança mensal com itens |
| IndexAdjustment | services/api/src/models/indexadjustment.js | Histórico de reajustes |
| InspectionReport | services/api/src/models/inspectionreport.js | Vistoria entrada/saída |
| TerminationNotice | services/api/src/models/terminationnotice.js | Rescisão |

## Schema dos novos modelos

### Owner
```javascript
{
  realmId: ObjectId (required),
  name: String (required),
  cpf: String,          // CPF ou CNPJ
  cnpj: String,
  rg: String,
  email: String,
  phone: String,
  address: {
    street: String,
    number: String,
    complement: String,
    neighborhood: String,
    city: String,
    state: String,
    zipCode: String      // CEP
  },
  bankAccount: {
    bank: String,
    agency: String,
    account: String,
    accountType: String, // corrente | poupança
    pixKey: String
  },
  receiptPreference: String, // boleto | pix | transferencia | cheque
  archived: Boolean,
  timestamps: true
}
```

### MonthlyCharge
```javascript
{
  realmId: ObjectId (required),
  leaseId: ObjectId (required),
  occupantId: ObjectId (required),
  propertyId: ObjectId (required),
  period: String,        // "2026-06" formato YYYY-MM
  dueDate: Date,
  items: [{
    type: String,        // aluguel | iptu | condominio | agua | luz | multa | desconto | outro
    description: String,
    amount: Number
  }],
  totalAmount: Number,
  status: String,        // pendente | emitido | pago | vencido | cancelado
  boletoId: String,      // ID do boleto na Cora
  boletoUrl: String,     // URL do boleto PDF
  paidAt: Date,
  paidAmount: Number,
  paymentMethod: String, // boleto | pix | transferencia | dinheiro | cheque
  timestamps: true
}
```

### Guarantee
```javascript
{
  realmId: ObjectId (required),
  leaseId: ObjectId (required),
  type: String,          // fiador | caucao | seguro_fianca | titulo_capitalizacao
  // Fiador
  guarantorId: ObjectId, // ref Occupant (pessoa)
  guarantorSpouseId: ObjectId,
  // Caução
  cautionValue: Number,
  cautionDepositDate: Date,
  // Seguro fiança
  insuranceCompany: String,
  insurancePolicyNumber: String,
  insuranceExpiry: Date,
  insuranceValue: Number,
  // Título capitalização
  capitalizationNumber: String,
  capitalizationValue: Number,
  archived: Boolean,
  timestamps: true
}
```

### IndexAdjustment
```javascript
{
  realmId: ObjectId (required),
  leaseId: ObjectId (required),
  appliedAt: Date,
  index: String,         // IGPM | IPCA | INCC | IVAR | IGP-DI
  period: String,        // período de referência "YYYY-MM"
  rate: Number,          // percentual aplicado ex: 4.52
  previousRent: Number,
  newRent: Number,
  status: String,        // pendente | aplicado | cancelado
  timestamps: true
}
```

## Rotas da API a criar

### Owners
```
GET    /api/v2/owners              — listar proprietários
POST   /api/v2/owners              — criar proprietário
GET    /api/v2/owners/:id          — buscar por ID
PUT    /api/v2/owners/:id          — atualizar
DELETE /api/v2/owners/:id          — arquivar (soft delete)
GET    /api/v2/owners/:id/properties — imóveis do proprietário
GET    /api/v2/owners/:id/statement  — extrato de repasses
```

### MonthlyCharges (cobranças)
```
GET    /api/v2/charges             — listar cobranças (filtro: período, status, inquilino)
POST   /api/v2/charges/generate    — gerar cobranças do mês para todos os contratos ativos
GET    /api/v2/charges/:id         — detalhe da cobrança
PUT    /api/v2/charges/:id         — atualizar (adicionar item, dar baixa manual)
POST   /api/v2/charges/:id/boleto  — emitir boleto via Cora
POST   /api/v2/charges/:id/pay     — registrar pagamento manual
GET    /api/v2/charges/:id/boleto/pdf — download PDF do boleto
```

### Adjustments (reajustes)
```
GET    /api/v2/adjustments/pending — contratos com reajuste pendente
POST   /api/v2/adjustments/apply   — aplicar reajuste em um contrato
GET    /api/v2/adjustments/indexes — buscar índices atuais (IGPM, IPCA, etc.)
```

### Webhooks
```
POST   /api/webhooks/cora          — receber confirmação de pagamento da Cora
```

## White-label

### Variáveis de ambiente por cliente
```env
NEXT_PUBLIC_BRAND_NAME=Arthur Levy Imóveis
NEXT_PUBLIC_BRAND_SHORT=Arthur Levy
NEXT_PUBLIC_BRAND_PRIMARY_COLOR=#006B3F
NEXT_PUBLIC_BRAND_PRIMARY_DARK=#004D2C
NEXT_PUBLIC_LOGO_URL=/static/logo.png
NEXT_PUBLIC_FAVICON_URL=/static/favicon.ico
```

### config/branding.js
```javascript
module.exports = {
  name: process.env.NEXT_PUBLIC_BRAND_NAME || 'LocaCentral',
  shortName: process.env.NEXT_PUBLIC_BRAND_SHORT || 'LocaCentral',
  primaryColor: process.env.NEXT_PUBLIC_BRAND_PRIMARY_COLOR || '#1B4FCC',
  primaryDark: process.env.NEXT_PUBLIC_BRAND_PRIMARY_DARK || '#1340A8',
  logoUrl: process.env.NEXT_PUBLIC_LOGO_URL || '/static/locacentral-logo.png',
}
```

## Integração Cora — fluxo do boleto

```
1. MonthlyCharge criada com status "pendente"
2. Locadora clica "Emitir Boleto"
3. API chama POST /v2/invoices na Cora com:
   - valor total da cobrança
   - data de vencimento
   - dados do pagador (inquilino)
4. Cora retorna boletoId e URL do PDF
5. MonthlyCharge atualizada: status "emitido", boletoId, boletoUrl
6. Email enviado ao inquilino com link do boleto
7. Inquilino paga → Cora dispara webhook
8. Webhook recebido → MonthlyCharge status "pago", paidAt registrado
```

## Deploy na VPS do cliente

```bash
# Clonar
git clone https://github.com/SEU_FORK/locacentral.git
cd locacentral

# Configurar
cp .env.example .env
# Editar .env com dados do cliente (marca, Cora, SMTP, etc.)

# Subir
docker compose up -d

# Acessar
# Painel locadora: http://IP:8080/landlord
# Portal inquilino: http://IP:8080/tenant
```
