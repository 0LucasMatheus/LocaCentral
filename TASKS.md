# LocaCentral — TASKS

## Como usar este arquivo

Execute uma tarefa por vez no Claude Code. Só marque como [x] após testar que funciona.
Antes de cada tarefa, diga ao Claude: "Leia o CLAUDE.md e o ARCHITECTURE.md antes de começar."

---

## FASE 0 — Setup inicial

- [x] **0.1** Fork e clone do MicroRealEstate
  - Fazer fork de https://github.com/microrealestate/microrealestate
  - Renomear para `locacentral` no GitHub
  - Clonar localmente
  - Adicionar CLAUDE.md, ARCHITECTURE.md e TASKS.md na raiz

- [x] **0.2** Subir o projeto base funcionando
  - Copiar `.env.domain` para `.env`
  - Rodar `docker compose up`
  - Confirmar que abre em `localhost:8080/landlord`
  - Criar realm de teste "Arthur Levy Imóveis"

- [x] **0.3** Criar `config/branding.js` e variáveis white-label
  - Criar arquivo `config/branding.js` conforme ARCHITECTURE.md
  - Adicionar variáveis `NEXT_PUBLIC_BRAND_*` no `.env.example`
  - Testar que o nome da marca aparece no frontend via env var

---

## FASE 1 — Extensões nos modelos existentes

- [x] **1.1** Estender modelo `Occupant` (inquilino) com campos brasileiros
  - Adicionar: `cpf`, `rg`, `rgIssuer`, `maritalStatus`, `nationality`, `profession`, `spouseName`, `spouseCpf`
  - Adicionar enum `maritalStatus`: solteiro | casado | divorciado | viúvo | união estável
  - Atualizar validações no manager `occupant.js`
  - Testar via API: criar inquilino com CPF

- [x] **1.2** Estender modelo `Property` (imóvel) com campos brasileiros
  - Adicionar: `registrationNumber` (matrícula), `iptuNumber`, `iptuValue`, `condominiumValue`, `propertyType`
  - Adicionar enum `propertyType`: casa | apartamento | comercial | terreno | sala | galpao
  - Atualizar manager `property.js`
  - Testar via API

- [x] **1.3** Estender modelo `Lease` (contrato) com campos brasileiros
  - Adicionar: `contractType` (determinado | indeterminado), `adjustmentIndex` (IGPM | IPCA | INCC | IVAR | IGP-DI), `adjustmentMonth` (mês aniversário), `penaltyMonths` (default: 3), `adminFeePercent`, `guaranteeType`
  - Manter compatibilidade com campos existentes
  - Testar via API

---

## FASE 2 — Modelo Owner (proprietário)

- [x] **2.1** Criar modelo `Owner`
  - Criar `services/api/src/models/owner.js` conforme schema em ARCHITECTURE.md
  - Incluir campos: nome, CPF/CNPJ, RG, email, telefone, endereço completo, dados bancários, preferência de recebimento
  - Sempre com `realmId` e `archived`

- [x] **2.2** Criar manager `owner.js` com CRUD completo
  - Criar `services/api/src/managers/owner.js`
  - Funções: `create`, `update`, `remove` (soft delete), `findAll`, `findOne`
  - Seguir padrão do `services/api/src/managers/occupant.js`

- [x] **2.3** Criar rotas REST para Owner
  - Adicionar rotas em `services/api/src/routes/`
  - GET /api/v2/owners, POST, GET/:id, PUT/:id, DELETE/:id
  - Proteger com middleware de auth existente

- [x] **2.4** Vincular Owner ao Property
  - Adicionar campo `ownerId: ObjectId` no modelo Property
  - Atualizar manager de property para aceitar ownerId
  - Testar: criar proprietário → criar imóvel vinculado ao proprietário

---

## FASE 3 — Modelo Guarantee (garantia)

- [x] **3.1** Criar modelo `Guarantee`
  - Criar `services/api/src/models/guarantee.js` conforme ARCHITECTURE.md
  - Suportar todos os 4 tipos: fiador, caução, seguro fiança, título capitalização
  - Campos condicionais por tipo

- [x] **3.2** Criar manager e rotas para Guarantee
  - CRUD básico vinculado ao leaseId
  - Endpoint: GET /api/v2/leases/:id/guarantee, POST, PUT

---

## FASE 4 — Engine de cobranças mensais

- [x] **4.1** Criar modelo `MonthlyCharge`
  - Criar `services/api/src/models/monthlycharge.js` conforme ARCHITECTURE.md
  - Items array com type, description, amount
  - Status machine: pendente → emitido → pago | vencido | cancelado

- [x] **4.2** Criar manager `monthlybilling.js`
  - Função `generateMonthlyCharges(realmId, period)`: gera cobranças para todos os contratos ativos do período
  - Função `addItem(chargeId, item)`: adiciona item (multa, desconto, etc.)
  - Função `registerPayment(chargeId, paymentData)`: baixa manual
  - Calcular total automaticamente ao salvar

- [x] **4.3** Criar rotas REST para MonthlyCharge
  - GET /api/v2/charges (filtros: period, status, occupantId, propertyId)
  - POST /api/v2/charges/generate
  - GET /api/v2/charges/:id
  - PUT /api/v2/charges/:id
  - POST /api/v2/charges/:id/pay

- [x] **4.4** Cron job de geração automática de cobranças
  - Rodar todo dia 1 do mês às 06:00
  - Gerar cobranças do mês corrente para todos os contratos ativos
  - Usar biblioteca `node-cron` (já presente no projeto)
  - Logar resultado da geração

---

## FASE 5 — Integração Cora (boletos)

- [x] **5.1** Criar módulo de integração Cora
  - Criar `services/api/src/integrations/cora.js`
  - Função `authenticate()`: OAuth2 client credentials
  - Função `createInvoice(chargeData)`: criar boleto
  - Função `cancelInvoice(boletoId)`: cancelar boleto
  - Usar env vars: CORA_CLIENT_ID, CORA_CLIENT_SECRET, CORA_ENVIRONMENT
  - Testar em sandbox da Cora

- [x] **5.2** Endpoint para emissão de boleto
  - POST /api/v2/charges/:id/boleto
  - Chamar Cora, salvar boletoId e boletoUrl na charge
  - Enviar email ao inquilino com link do boleto via emailer existente

- [x] **5.3** Webhook de confirmação de pagamento
  - Criar `services/api/src/routes/webhooks/cora.js`
  - Receber POST da Cora ao confirmar pagamento
  - Atualizar MonthlyCharge: status pago, paidAt, paidAmount
  - Validar assinatura do webhook (HMAC)

---

## FASE 6 — Reajuste por índice

- [x] **6.1** Criar serviço de busca de índices
  - Criar `services/api/src/integrations/indexes.js`
  - Função `getIPCA(period)`: buscar IPCA do IBGE (API SIDRA)
  - Função `getIGPM(period)`: buscar IGPM da FGV
  - Cache no Redis por 24h para não sobrecarregar APIs

- [x] **6.2** Criar modelo e manager `IndexAdjustment`
  - Criar modelo conforme ARCHITECTURE.md
  - Função `calculateAdjustment(leaseId)`: calcula novo valor com base no índice
  - Função `applyAdjustment(leaseId)`: aplica e registra histórico

- [x] **6.3** Cron job de reajuste automático
  - Rodar diariamente
  - Verificar contratos com aniversário hoje
  - Criar registro `IndexAdjustment` com status "pendente"
  - NÃO aplicar automaticamente — apenas notificar a locadora

- [x] **6.4** Endpoint para listar e aplicar reajustes pendentes
  - GET /api/v2/adjustments/pending
  - POST /api/v2/adjustments/:id/apply

---

## FASE 7 — Templates de contrato e PDF

- [ ] **7.1** Criar template base de contrato de locação
  - Criar template HTML em `services/pdfgenerator/src/templates/lease-br/`
  - Variáveis: [[prop_nome]], [[inq_nome]], [[imovel_endereco]], [[valor_aluguel]], [[data_inicio]], [[data_fim]], [[fiador_nome]], [[imob_cnpj]], etc.
  - Seguir padrão visual do Unilocweb (visto nos prints)
  - Testar geração do PDF com dados reais

- [ ] **7.2** Endpoint para gerar PDF do contrato
  - POST /api/v2/leases/:id/document/pdf
  - Montar dados do contrato (lease + occupant + owner + property + guarantee)
  - Chamar pdfgenerator com template e dados
  - Retornar PDF para download

- [ ] **7.3** Editor de template no frontend (básico)
  - Tela para a locadora editar o texto do contrato
  - Mostrar variáveis disponíveis ([[prop_nome]], etc.)
  - Preview em tempo real
  - Salvar template customizado por realm

---

## FASE 8 — Frontend painel da locadora

- [ ] **8.1** Dashboard principal (inspirado no Unilocweb)
  - Cards: contratos ativos, para reajuste, vencendo em 30 dias, vencidos
  - Cards financeiros: cobranças recebidas, a vencer, vencidas
  - Card inadimplentes: valor acumulado, nº de cobranças, nº de contratos
  - Gráfico evolução da carteira (contratos ativos por mês)
  - Gráfico índices (IGPM, IPCA) nos últimos 24 meses

- [ ] **8.2** Tela de Proprietários (CRUD)
  - Listagem com busca e filtros
  - Formulário de cadastro com CEP autocomplete (ViaCEP)
  - Detalhe: imóveis vinculados, extrato de repasses

- [ ] **8.3** Tela de Imóveis (CRUD)
  - Listagem com busca e filtros
  - Formulário com vinculação ao proprietário
  - CEP autocomplete

- [ ] **8.4** Tela de Pessoas/Inquilinos (CRUD)
  - Listagem com busca
  - Formulário com campos brasileiros (CPF, RG, estado civil)
  - Histórico de contratos da pessoa

- [ ] **8.5** Tela de Contratos — listagem
  - Tabela com: nº contrato, imóvel, locatário, locador, valor, status
  - Filtros: ativos, inativos, rascunhos, arquivados
  - Busca por código, nome, endereço
  - Paginação

- [ ] **8.6** Tela de Contrato — cadastro/edição
  - Seção: Imóvel (busca e seleção)
  - Seção: Locadores (proprietário + % repasse)
  - Seção: Locatários (inquilino principal + secundários)
  - Seção: Fiador / Garantia
  - Seção: Dados do contrato (datas, valor, índice, multa)
  - Seção: Condições especiais

- [ ] **8.7** Tela de Cobranças — listagem e emissão
  - Listagem por período com status visual
  - Botão "Gerar cobranças do mês"
  - Botão "Emitir boleto" por cobrança
  - Botão "Registrar pagamento" manual
  - Filtros por status, período, inquilino

- [ ] **8.8** Tela de Reajustes pendentes
  - Listar contratos com reajuste no mês
  - Mostrar: índice, percentual, valor atual → valor novo
  - Botão "Aplicar reajuste"

---

## FASE 9 — Portal do inquilino

- [ ] **9.1** Página de login do inquilino (OTP por email — já existe no MRE)
  - Ajustar visual para white-label
  - Texto em pt-BR

- [ ] **9.2** Página inicial do inquilino
  - Dados do contrato ativo (imóvel, valor, vencimento)
  - Cobranças do mês atual e histórico

- [ ] **9.3** Página de cobrança do inquilino
  - Ver detalhes da cobrança (itens)
  - Botão para download/visualização do boleto
  - Status: pendente / pago / vencido

---

## FASE 10 — White-label e deploy

- [ ] **10.1** Aplicar white-label completo no frontend
  - Logo via env var
  - Cores primárias via CSS variables
  - Nome da empresa em todos os textos

- [x] **10.2** Script de setup para nova instalação de cliente
  - Script `scripts/setup-client.sh` que pergunta: nome, cores, logo, credenciais
  - Gera `.env` configurado para o cliente
  - Instrução de deploy na VPS

- [ ] **10.3** Documentação de deploy
  - README com passo a passo para instalar em VPS Ubuntu
  - Configuração de domínio + SSL com Nginx + Certbot
  - Backup do MongoDB

---

## Backlog (pós-MVP)

- [ ] Vistoria de entrada/saída com fotos
- [ ] Rescisão contratual com cálculo de multa
- [ ] Relatório de repasses ao proprietário
- [ ] Notas fiscais (NFS-e)
- [ ] App mobile PWA para inquilino
- [ ] Multi-instância (um LocaCentral, múltiplos clientes)
- [ ] Painel LocaCentral para gerenciar clientes (SaaS)
- [ ] Integração Serasa para consulta de CPF
- [ ] Assinatura digital de contratos
- [ ] Notificações WhatsApp
