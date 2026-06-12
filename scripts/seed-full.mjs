/**
 * Seed COMPLETO — popula todas as coleções do LocaCentral com dados de exemplo.
 * Dropa o banco antes de reinserir tudo.
 *
 * Como rodar:
 *   docker cp scripts/seed-full.mjs locacentral-api-1:/usr/app/seed-full.mjs
 *   docker exec locacentral-api-1 node /usr/app/seed-full.mjs
 */

import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import moment from 'moment';

const MONGO_URL = process.env.MONGO_URL || 'mongodb://mongo/mredb';

// ─── Schemas ────────────────────────────────────────────────────────────────

const RealmSchema = new mongoose.Schema({
  name: String,
  members: [{ name: String, email: String, role: String, registered: Boolean }],
  addresses: [{ street1: String, street2: String, zipCode: String, city: String, state: String, country: String }],
  bankInfo: { name: String, iban: String },
  contacts: [{ name: String, email: String, phone1: String, phone2: String }],
  isCompany: Boolean,
  companyInfo: { name: String, legalStructure: String, legalRepresentative: String, capital: Number, ein: String },
  thirdParties: mongoose.Schema.Types.Mixed,
  locale: String,
  currency: String,
});

const AccountSchema = new mongoose.Schema({
  firstname: String, lastname: String,
  email: String, password: String, createdDate: Date,
});

const LeaseSchema = new mongoose.Schema({
  realmId: String, name: String, description: String,
  numberOfTerms: Number, timeRange: String, active: Boolean,
  stepperMode: { type: Boolean, default: false },
  contractType: String, adjustmentIndex: String, adjustmentMonth: Number,
  penaltyMonths: { type: Number, default: 3 }, adminFeePercent: Number, guaranteeType: String,
});

const PropertySchema = new mongoose.Schema({
  realmId: String, type: String, name: String, description: String,
  surface: Number, phone: String, digicode: String,
  address: { street1: String, street2: String, zipCode: String, city: String, state: String, country: String },
  price: Number,
  propertyType: String, registrationNumber: String, iptuNumber: String,
  iptuValue: Number, condominiumValue: Number, ownerIdBr: String,
});

const TenantSchema = new mongoose.Schema({
  realmId: String, name: String, isCompany: Boolean, company: String, manager: String,
  street1: String, street2: String, zipCode: String, city: String, country: String,
  contacts: [{ contact: String, phone: String, email: String }],
  reference: String, contract: String, leaseId: String,
  beginDate: Date, endDate: Date, terminationDate: Date,
  properties: mongoose.Schema.Types.Mixed, rents: mongoose.Schema.Types.Mixed,
  isVat: Boolean, vatRatio: Number, discount: Number, guaranty: Number, guarantyPayback: Number,
  stepperMode: { type: Boolean, default: false },
  cpf: String, rg: String, rgIssuer: String,
  maritalStatus: String, nationality: String, profession: String,
  spouseName: String, spouseCpf: String,
});

const OwnerSchema = new mongoose.Schema({
  realmId: { type: String, required: true },
  name: { type: String, required: true }, cpf: String, cnpj: String, rg: String,
  email: String, phone: String,
  address: { street: String, number: String, complement: String, neighborhood: String, city: String, state: String, zipCode: String },
  bankAccount: { bank: String, agency: String, account: String, accountType: String, pixKey: String },
  receiptPreference: String, archived: { type: Boolean, default: false },
}, { timestamps: true });

const GuaranteeSchema = new mongoose.Schema({
  realmId: { type: String, required: true }, leaseId: { type: String, required: true },
  type: { type: String, required: true },
  guarantorName: String, guarantorCpf: String, guarantorRg: String, guarantorPhone: String,
  guarantorEmail: String, guarantorAddress: String, guarantorSpouseName: String, guarantorSpouseCpf: String,
  cautionValue: Number, cautionDepositDate: Date, cautionBankAccount: String,
  insuranceCompany: String, insurancePolicyNumber: String, insuranceExpiry: Date, insuranceValue: Number,
  capitalizationNumber: String, capitalizationValue: Number, capitalizationCompany: String,
  archived: { type: Boolean, default: false },
}, { timestamps: true });

const ChargeItemSchema = new mongoose.Schema({
  type: String, description: String, amount: Number,
}, { _id: false });

const MonthlyChargeSchema = new mongoose.Schema({
  realmId: { type: String, required: true }, leaseId: { type: String, required: true },
  occupantId: { type: String, required: true }, propertyId: String,
  period: { type: String, required: true }, dueDate: Date,
  items: [ChargeItemSchema], totalAmount: { type: Number, default: 0 },
  status: { type: String, default: 'pendente' },
  boletoId: String, boletoUrl: String,
  paidAt: Date, paidAmount: Number, paymentMethod: String, paymentReference: String,
}, { timestamps: true });

MonthlyChargeSchema.pre('save', function(next) {
  this.totalAmount = this.items.reduce((s, i) => s + (i.amount || 0), 0);
  next();
});

const IndexAdjustmentSchema = new mongoose.Schema({
  realmId: { type: String, required: true }, leaseId: { type: String, required: true },
  occupantId: String, appliedAt: Date,
  index: String, period: String, rate: Number,
  previousRent: Number, newRent: Number,
  status: { type: String, default: 'pendente' },
}, { timestamps: true });

const Realm        = mongoose.model('Realm',           RealmSchema);
const Account      = mongoose.model('Account',         AccountSchema);
const Lease        = mongoose.model('Lease',           LeaseSchema);
const Property     = mongoose.model('Property',        PropertySchema);
const Tenant       = mongoose.model('Occupant',        TenantSchema);
const Owner        = mongoose.model('Owner',           OwnerSchema);
const Guarantee    = mongoose.model('Guarantee',       GuaranteeSchema);
const MonthlyCharge = mongoose.model('MonthlyCharge',  MonthlyChargeSchema);
const IndexAdjustment = mongoose.model('IndexAdjustment', IndexAdjustmentSchema);

// ─── Rent computation ────────────────────────────────────────────────────────

function computeRents(beginDate, endDate, rentAmount, propertyName, expenses = [], paidUntil = null) {
  const rents = [];
  const begin = moment(beginDate);
  const end   = moment(endDate);
  let current = begin.clone();

  while (current.isSameOrBefore(end, 'month')) {
    const term = Number(current.clone().startOf('month').format('YYYYMMDDHH'));
    const expensesTotal = expenses.reduce((s, e) => s + (e.amount || 0), 0);
    const isPaid = paidUntil ? current.isSameOrBefore(moment(paidUntil), 'month') : false;
    rents.push({
      term,
      month: current.month() + 1,
      year: current.year(),
      preTaxAmounts: [{ description: propertyName, amount: rentAmount }],
      charges: expenses.map(e => ({ description: e.title, amount: e.amount })),
      discounts: [], debts: [], vats: [],
      payments: isPaid ? [{ date: current.clone().date(5).toDate(), amount: rentAmount + expensesTotal, type: 'transfer', reference: '' }] : [],
      description: '',
      total: {
        preTaxAmount: rentAmount, charges: expensesTotal, vat: 0, discount: 0, debts: 0,
        balance: isPaid ? 0 : -(rentAmount + expensesTotal),
        grandTotal: rentAmount + expensesTotal,
        payment: isPaid ? rentAmount + expensesTotal : 0,
      },
    });
    current.add(1, 'month');
  }
  return rents;
}

// ─── Seed ────────────────────────────────────────────────────────────────────

async function seed() {
  await mongoose.connect(MONGO_URL);
  console.log('✔ Conectado ao MongoDB:', MONGO_URL);

  await mongoose.connection.db.dropDatabase();
  console.log('✔ Banco dropado');

  // ── Realm ──────────────────────────────────────────────────────────────────
  const realm = await Realm.create({
    name: 'Arthur Levy Imóveis',
    members: [{ name: 'Admin LocaCentral', email: 'admin@locacentral.com.br', role: 'administrator', registered: true }],
    addresses: [{ street1: 'Rua das Palmeiras, 123', zipCode: '08673-000', city: 'Suzano', state: 'SP', country: 'BR' }],
    bankInfo: { name: 'Bradesco', iban: 'BR1200360305000010009795493P1' },
    contacts: [{ name: 'Arthur Levy', email: 'arthur@arthurlevy.com.br', phone1: '(11) 4745-0001' }],
    isCompany: true,
    companyInfo: { name: 'Arthur Levy Imóveis Ltda', legalStructure: 'Ltda', legalRepresentative: 'Arthur Levy', capital: 100000, ein: '12.345.678/0001-90' },
    locale: 'pt-BR', currency: 'BRL',
  });
  const realmId = String(realm._id);
  console.log('✔ Realm criado:', realm.name);

  // ── Account ────────────────────────────────────────────────────────────────
  await Account.create({
    firstname: 'Admin', lastname: 'LocaCentral',
    email: 'admin@locacentral.com.br',
    password: bcrypt.hashSync('Admin@123', 10),
    createdDate: new Date(),
  });
  console.log('✔ Usuário admin: admin@locacentral.com.br / Admin@123');

  // ── Leases ─────────────────────────────────────────────────────────────────
  const [leaseRes30, leaseRes12, leaseCom24, leaseRes30_2, leaseRes24] = await Lease.insertMany([
    { realmId, name: 'Residencial 30 Meses', description: 'Contrato residencial padrão — 30 meses', numberOfTerms: 30, timeRange: 'months', active: true, contractType: 'determinado', adjustmentIndex: 'IGPM', adjustmentMonth: 6, penaltyMonths: 3 },
    { realmId, name: 'Residencial 12 Meses', description: 'Contrato residencial curto prazo — 12 meses', numberOfTerms: 12, timeRange: 'months', active: true, contractType: 'determinado', adjustmentIndex: 'IPCA', adjustmentMonth: 3, penaltyMonths: 3 },
    { realmId, name: 'Comercial 24 Meses',   description: 'Contrato comercial — 24 meses', numberOfTerms: 24, timeRange: 'months', active: true, contractType: 'determinado', adjustmentIndex: 'IPCA', adjustmentMonth: 1, penaltyMonths: 3 },
    { realmId, name: 'Residencial 30 Meses (IPCA)', description: 'Residencial com reajuste pelo IPCA', numberOfTerms: 30, timeRange: 'months', active: true, contractType: 'determinado', adjustmentIndex: 'IPCA', adjustmentMonth: 8, penaltyMonths: 3 },
    { realmId, name: 'Residencial 24 Meses — ARQUIVADO', description: 'Modelo antigo arquivado', numberOfTerms: 24, timeRange: 'months', active: false, contractType: 'determinado' },
  ]);
  console.log('✔ Modelos de contrato criados: 5');

  // ── Owners ─────────────────────────────────────────────────────────────────
  const [ownerCarlos, ownerLucia, ownerFirma, ownerRoberto] = await Owner.insertMany([
    {
      realmId, name: 'Carlos Eduardo Mendes', cpf: '123.456.789-00', rg: '12.345.678-9', email: 'carlos.mendes@email.com', phone: '(11) 98001-2345',
      address: { street: 'Rua das Orquídeas', number: '200', city: 'Suzano', state: 'SP', zipCode: '08673-300' },
      bankAccount: { bank: 'Bradesco', agency: '1234', account: '56789-0', accountType: 'corrente', pixKey: 'carlos.mendes@email.com' },
      receiptPreference: 'pix', archived: false,
    },
    {
      realmId, name: 'Lúcia Fátima Souza', cpf: '987.654.321-00', rg: '98.765.432-1', email: 'lucia.souza@email.com', phone: '(11) 97002-3456',
      address: { street: 'Av. do Trabalho', number: '580', city: 'Mogi das Cruzes', state: 'SP', zipCode: '08780-100' },
      bankAccount: { bank: 'Itaú', agency: '5678', account: '12345-6', accountType: 'corrente', pixKey: '987.654.321-00' },
      receiptPreference: 'transferencia', archived: false,
    },
    {
      realmId, name: 'Imóveis Silva & Associados Ltda', cnpj: '12.345.678/0001-99', email: 'financeiro@silvaassoc.com.br', phone: '(11) 4745-8888',
      address: { street: 'Rua Comércio', number: '1', city: 'Mogi das Cruzes', state: 'SP', zipCode: '08780-200' },
      bankAccount: { bank: 'Santander', agency: '9012', account: '34567-8', accountType: 'corrente', pixKey: '12.345.678/0001-99' },
      receiptPreference: 'transferencia', archived: false,
    },
    {
      realmId, name: 'Roberto Augusto Lima', cpf: '456.789.012-33', rg: '45.678.901-2', email: 'roberto.lima@email.com', phone: '(11) 96003-4567',
      address: { street: 'Rua das Acácias', number: '78', city: 'Suzano', state: 'SP', zipCode: '08673-200' },
      bankAccount: { bank: 'Caixa', agency: '3456', account: '78901-2', accountType: 'poupanca', pixKey: '456.789.012-33' },
      receiptPreference: 'pix', archived: false,
    },
  ]);
  console.log('✔ Proprietários criados: 4');

  // ── Properties ─────────────────────────────────────────────────────────────
  const props = await Property.insertMany([
    {
      realmId, type: 'house', name: 'Casa das Flores', surface: 120,
      description: 'Casa com 3 quartos, garagem, quintal',
      address: { street1: 'Rua das Flores, 45', zipCode: '08673-100', city: 'Suzano', state: 'SP', country: 'BR' },
      price: 2200, propertyType: 'casa', registrationNumber: '12345', iptuNumber: 'IP-0001', iptuValue: 120, condominiumValue: 0,
      ownerIdBr: String(ownerCarlos._id),
    },
    {
      realmId, type: 'apartment', name: 'Apto Yunes', surface: 68,
      description: 'Apartamento 2 quartos, 1 vaga, condomínio fechado',
      address: { street1: 'Av. Miguel Yunes, 890', street2: 'Apto 42', zipCode: '08613-010', city: 'Suzano', state: 'SP', country: 'BR' },
      price: 1800, propertyType: 'apartamento', registrationNumber: '67890', iptuNumber: 'IP-0002', iptuValue: 80, condominiumValue: 350,
      ownerIdBr: String(ownerLucia._id),
    },
    {
      realmId, type: 'house', name: 'Casa Bela Vista', surface: 90,
      description: 'Casa 2 quartos, quintal, edícula',
      address: { street1: 'Rua Bela Vista, 12', zipCode: '08560-000', city: 'Poá', state: 'SP', country: 'BR' },
      price: 1500, propertyType: 'casa', registrationNumber: '11111', iptuNumber: 'IP-0003', iptuValue: 90, condominiumValue: 0,
      ownerIdBr: String(ownerCarlos._id),
    },
    {
      realmId, type: 'apartment', name: 'Apto Centro Mogi', surface: 75,
      description: 'Apartamento 3 quartos, 2 vagas, piscina',
      address: { street1: 'Rua São Paulo, 234', street2: 'Apto 101', zipCode: '08780-000', city: 'Mogi das Cruzes', state: 'SP', country: 'BR' },
      price: 2500, propertyType: 'apartamento', registrationNumber: '22222', iptuNumber: 'IP-0004', iptuValue: 200, condominiumValue: 350,
      ownerIdBr: String(ownerFirma._id),
    },
    {
      realmId, type: 'commercial', name: 'Loja Av. Benedito', surface: 140,
      description: 'Loja térrea com depósito, esquina',
      address: { street1: 'Av. Benedito Tobias, 1000', zipCode: '08790-000', city: 'Mogi das Cruzes', state: 'SP', country: 'BR' },
      price: 3500, propertyType: 'comercial', registrationNumber: '33333', iptuNumber: 'IP-0005', iptuValue: 420, condominiumValue: 280,
      ownerIdBr: String(ownerFirma._id),
    },
    {
      realmId, type: 'house', name: 'Casa das Acácias', surface: 100,
      description: 'Casa 3 quartos, garagem 2 carros — disponível',
      address: { street1: 'Rua das Acácias, 78', zipCode: '08673-200', city: 'Suzano', state: 'SP', country: 'BR' },
      price: 1900, propertyType: 'casa', registrationNumber: '44444', iptuNumber: 'IP-0006', iptuValue: 100, condominiumValue: 0,
      ownerIdBr: String(ownerRoberto._id),
    },
    {
      realmId, type: 'apartment', name: 'Apto XV Novembro', surface: 55,
      description: 'Studio reformado, próximo ao centro — disponível',
      address: { street1: 'Rua XV de Novembro, 56', street2: 'Apto 23', zipCode: '08673-050', city: 'Suzano', state: 'SP', country: 'BR' },
      price: 1400, propertyType: 'apartamento', registrationNumber: '55555', iptuNumber: 'IP-0007', iptuValue: 70, condominiumValue: 180,
      ownerIdBr: String(ownerRoberto._id),
    },
  ]);
  const [pFlores, pYunes, pBelaVista, pMogi, pLoja] = props;
  console.log('✔ Imóveis criados: 7');

  // ── Tenants ────────────────────────────────────────────────────────────────
  // 1. João da Silva — ativo, em dia
  const b1 = moment('2023-06-01'), e1 = b1.clone().add(30, 'months');
  const t1 = await Tenant.create({
    realmId, name: 'João da Silva',
    street1: 'Rua das Flores, 45', zipCode: '08673-100', city: 'Suzano', country: 'BR',
    contacts: [{ contact: 'João da Silva', phone: '(11) 98765-4321', email: 'joao.silva@email.com' }],
    reference: 'JDS-001', contract: String(leaseRes30._id), leaseId: String(leaseRes30._id),
    beginDate: b1.toDate(), endDate: e1.toDate(),
    properties: [{ propertyId: String(pFlores._id), property: pFlores.toObject(), rent: 2200, expenses: [{ title: 'IPTU', amount: 120 }, { title: 'Condomínio', amount: 180 }], entryDate: b1.toDate() }],
    rents: computeRents(b1, e1, 2200, 'Casa das Flores', [{ title: 'IPTU', amount: 120 }, { title: 'Condomínio', amount: 180 }], moment().startOf('month').toDate()),
    guaranty: 6600, stepperMode: false,
    cpf: '111.222.333-44', rg: '11.222.333-4', rgIssuer: 'SSP/SP',
    maritalStatus: 'casado', nationality: 'Brasileiro', profession: 'Engenheiro',
    spouseName: 'Ana da Silva', spouseCpf: '222.333.444-55',
  });

  // 2. Maria Santos — ativo, 1 mês em atraso
  const b2 = moment('2024-03-01'), e2 = b2.clone().add(12, 'months');
  const t2 = await Tenant.create({
    realmId, name: 'Maria Santos',
    street1: 'Av. Miguel Yunes, 890', zipCode: '08613-010', city: 'Suzano', country: 'BR',
    contacts: [{ contact: 'Maria Santos', phone: '(11) 97654-3210', email: 'maria.santos@email.com' }],
    reference: 'MAS-002', contract: String(leaseRes12._id), leaseId: String(leaseRes12._id),
    beginDate: b2.toDate(), endDate: e2.toDate(),
    properties: [{ propertyId: String(pYunes._id), property: pYunes.toObject(), rent: 1800, expenses: [{ title: 'Água', amount: 85 }], entryDate: b2.toDate() }],
    rents: computeRents(b2, e2, 1800, 'Apto Yunes', [{ title: 'Água', amount: 85 }], moment().subtract(2, 'months').startOf('month').toDate()),
    guaranty: 5400, stepperMode: false,
    cpf: '333.444.555-66', rg: '33.444.555-6', rgIssuer: 'SSP/SP',
    maritalStatus: 'solteiro', nationality: 'Brasileira', profession: 'Professora',
  });

  // 3. Pedro Oliveira — ativo, em dia
  const b3 = moment('2023-08-01'), e3 = b3.clone().add(30, 'months');
  const t3 = await Tenant.create({
    realmId, name: 'Pedro Oliveira',
    street1: 'Rua Bela Vista, 12', zipCode: '08560-000', city: 'Poá', country: 'BR',
    contacts: [{ contact: 'Pedro Oliveira', phone: '(11) 96543-2109', email: 'pedro.oliveira@email.com' }],
    reference: 'POL-003', contract: String(leaseRes30._id), leaseId: String(leaseRes30._id),
    beginDate: b3.toDate(), endDate: e3.toDate(),
    properties: [{ propertyId: String(pBelaVista._id), property: pBelaVista.toObject(), rent: 1500, expenses: [], entryDate: b3.toDate() }],
    rents: computeRents(b3, e3, 1500, 'Casa Bela Vista', [], moment().startOf('month').toDate()),
    guaranty: 4500, stepperMode: false,
    cpf: '444.555.666-77', rg: '44.555.666-7', rgIssuer: 'SSP/SP',
    maritalStatus: 'divorciado', nationality: 'Brasileiro', profession: 'Contador',
  });

  // 4. Ana Costa — ativo, em dia
  const b4 = moment('2024-10-01'), e4 = b4.clone().add(12, 'months');
  const t4 = await Tenant.create({
    realmId, name: 'Ana Costa',
    street1: 'Rua São Paulo, 234', zipCode: '08780-000', city: 'Mogi das Cruzes', country: 'BR',
    contacts: [{ contact: 'Ana Costa', phone: '(11) 95432-1098', email: 'ana.costa@email.com' }],
    reference: 'ACO-004', contract: String(leaseRes12._id), leaseId: String(leaseRes12._id),
    beginDate: b4.toDate(), endDate: e4.toDate(),
    properties: [{ propertyId: String(pMogi._id), property: pMogi.toObject(), rent: 2500, expenses: [{ title: 'Condomínio', amount: 350 }, { title: 'IPTU', amount: 200 }], entryDate: b4.toDate() }],
    rents: computeRents(b4, e4, 2500, 'Apto Centro Mogi', [{ title: 'Condomínio', amount: 350 }, { title: 'IPTU', amount: 200 }], moment().startOf('month').toDate()),
    guaranty: 7500, stepperMode: false,
    cpf: '555.666.777-88', rg: '55.666.777-8', rgIssuer: 'SSP/SP',
    maritalStatus: 'casado', nationality: 'Brasileira', profession: 'Médica',
    spouseName: 'Bruno Costa', spouseCpf: '666.777.888-99',
  });

  // 5. ABC Comércio — empresa ativa, em dia
  const b5 = moment('2024-01-01'), e5 = b5.clone().add(24, 'months');
  const t5 = await Tenant.create({
    realmId, name: 'ABC Comércio Ltda',
    isCompany: true, company: 'ABC Comércio Ltda', manager: 'Carlos Mendes',
    street1: 'Av. Benedito Tobias, 1000', zipCode: '08790-000', city: 'Mogi das Cruzes', country: 'BR',
    contacts: [{ contact: 'Carlos Mendes', phone: '(11) 94321-0987', email: 'carlos@abccomercio.com.br' }, { contact: 'Financeiro ABC', phone: '(11) 4745-2222', email: 'financeiro@abccomercio.com.br' }],
    reference: 'ABC-005', contract: String(leaseCom24._id), leaseId: String(leaseCom24._id),
    beginDate: b5.toDate(), endDate: e5.toDate(),
    properties: [{ propertyId: String(pLoja._id), property: pLoja.toObject(), rent: 3500, expenses: [{ title: 'IPTU', amount: 420 }, { title: 'Condomínio', amount: 280 }], entryDate: b5.toDate() }],
    rents: computeRents(b5, e5, 3500, 'Loja Av. Benedito', [{ title: 'IPTU', amount: 420 }, { title: 'Condomínio', amount: 280 }], moment().startOf('month').toDate()),
    guaranty: 10500, stepperMode: false,
  });

  // 6. Fernando Lima — inativo (contrato encerrado)
  const b6 = moment('2022-01-01'), e6 = b6.clone().add(12, 'months');
  const t6 = await Tenant.create({
    realmId, name: 'Fernando Lima',
    street1: 'Rua das Palmeiras, 321', zipCode: '08673-000', city: 'Suzano', country: 'BR',
    contacts: [{ contact: 'Fernando Lima', phone: '(11) 93000-1111', email: 'fernando.lima@email.com' }],
    reference: 'FLI-006', contract: String(leaseRes12._id), leaseId: String(leaseRes12._id),
    beginDate: b6.toDate(), endDate: e6.toDate(), terminationDate: e6.toDate(),
    properties: [{ propertyId: String(props[5]._id), property: props[5].toObject(), rent: 1900, expenses: [], entryDate: b6.toDate(), exitDate: e6.toDate() }],
    rents: computeRents(b6, e6, 1900, 'Casa das Acácias', [], e6.toDate()),
    guaranty: 5700, stepperMode: false,
    cpf: '777.888.999-00', rg: '77.888.999-0', rgIssuer: 'SSP/SP',
    maritalStatus: 'solteiro', nationality: 'Brasileiro', profession: 'Autônomo',
  });

  console.log('✔ Inquilinos criados: 6 (5 ativos + 1 inativo)');

  // ── Guarantees ─────────────────────────────────────────────────────────────
  await Guarantee.insertMany([
    {
      realmId, leaseId: String(leaseRes30._id), type: 'fiador',
      guarantorName: 'Roberto Pereira Silva', guarantorCpf: '100.200.300-40',
      guarantorRg: '10.020.030-4', guarantorPhone: '(11) 98800-1234',
      guarantorEmail: 'roberto.pereira@email.com',
      guarantorAddress: 'Rua do Fiador, 55, Suzano/SP',
      guarantorSpouseName: 'Marta Pereira', guarantorSpouseCpf: '200.300.400-50',
      archived: false,
    },
    {
      realmId, leaseId: String(leaseRes12._id), type: 'caucao',
      cautionValue: 5400, cautionDepositDate: new Date('2024-03-01'),
      cautionBankAccount: 'Bradesco / Ag 1234 / CC 56789-0',
      archived: false,
    },
    {
      realmId, leaseId: String(leaseCom24._id), type: 'seguro_fianca',
      insuranceCompany: 'Porto Seguro', insurancePolicyNumber: 'PS-2024-000123',
      insuranceExpiry: new Date('2026-01-01'), insuranceValue: 10500,
      archived: false,
    },
    {
      realmId, leaseId: String(leaseRes30_2._id), type: 'titulo_capitalizacao',
      capitalizationNumber: 'TC-2024-789456', capitalizationValue: 7500,
      capitalizationCompany: 'Bradesco Capitalização',
      archived: false,
    },
  ]);
  console.log('✔ Garantias criadas: 4');

  // ── MonthlyCharges ─────────────────────────────────────────────────────────
  const charges = [];
  const allTenants = [
    { tenant: t1, rent: 2200, propId: String(pFlores._id), leaseId: String(leaseRes30._id), extras: [{ title: 'IPTU', amount: 120 }, { title: 'Condomínio', amount: 180 }] },
    { tenant: t2, rent: 1800, propId: String(pYunes._id),   leaseId: String(leaseRes12._id), extras: [{ title: 'Água', amount: 85 }] },
    { tenant: t3, rent: 1500, propId: String(pBelaVista._id), leaseId: String(leaseRes30._id), extras: [] },
    { tenant: t4, rent: 2500, propId: String(pMogi._id),    leaseId: String(leaseRes12._id), extras: [{ title: 'Condomínio', amount: 350 }, { title: 'IPTU', amount: 200 }] },
    { tenant: t5, rent: 3500, propId: String(pLoja._id),    leaseId: String(leaseCom24._id), extras: [{ title: 'IPTU', amount: 420 }, { title: 'Condomínio', amount: 280 }] },
  ];

  for (let m = 5; m >= 0; m--) {
    const period = moment().subtract(m, 'months').format('YYYY-MM');
    const dueDate = moment(period + '-05').toDate();

    for (const { tenant, rent, propId, leaseId, extras } of allTenants) {
      const items = [
        { type: 'aluguel', description: 'Aluguel', amount: rent },
        ...extras.map(e => ({ type: e.title.toLowerCase().includes('iptu') ? 'iptu' : e.title.toLowerCase().includes('cond') ? 'condominio' : e.title.toLowerCase().includes('água') || e.title.toLowerCase().includes('agua') ? 'agua' : 'outro', description: e.title, amount: e.amount })),
      ];
      const total = items.reduce((s, i) => s + i.amount, 0);

      // mês atual = pendente; 2 meses atrás para maria = vencido; resto = pago
      let status, paidAt, paidAmount, paymentMethod;
      const isCurrentMonth = m === 0;
      const isMaria = String(tenant._id) === String(t2._id);
      const isLast2Months = m <= 1;

      if (isCurrentMonth) {
        status = 'pendente';
      } else if (isMaria && isLast2Months) {
        status = 'vencido';
      } else {
        status = 'pago';
        paidAt = moment(period + '-10').toDate();
        paidAmount = total;
        paymentMethod = 'transferencia';
      }

      charges.push({ realmId, leaseId, occupantId: String(tenant._id), propertyId: propId, period, dueDate, items, totalAmount: total, status, paidAt, paidAmount, paymentMethod });
    }
  }

  await MonthlyCharge.insertMany(charges);
  console.log('✔ Cobranças mensais criadas:', charges.length);

  // ── IndexAdjustments ───────────────────────────────────────────────────────
  await IndexAdjustment.insertMany([
    {
      realmId, leaseId: String(leaseRes30._id), occupantId: String(t1._id),
      index: 'IGPM', period: '2024-06', rate: 4.52,
      previousRent: 2100, newRent: 2195.04,
      status: 'aplicado', appliedAt: new Date('2024-06-15'),
    },
    {
      realmId, leaseId: String(leaseRes30._id), occupantId: String(t3._id),
      index: 'IGPM', period: '2024-08', rate: 4.52,
      previousRent: 1450, newRent: 1515.54,
      status: 'aplicado', appliedAt: new Date('2024-08-15'),
    },
    {
      realmId, leaseId: String(leaseCom24._id), occupantId: String(t5._id),
      index: 'IPCA', period: '2025-01', rate: 3.83,
      previousRent: 3500, newRent: 3634.05,
      status: 'aplicado', appliedAt: new Date('2025-01-10'),
    },
    {
      realmId, leaseId: String(leaseRes30._id), occupantId: String(t1._id),
      index: 'IGPM', period: '2025-06', rate: 5.10,
      previousRent: 2195.04, newRent: 2307.07,
      status: 'pendente',
    },
    {
      realmId, leaseId: String(leaseRes30._id), occupantId: String(t3._id),
      index: 'IGPM', period: '2025-08', rate: 5.10,
      previousRent: 1515.54, newRent: 1592.41,
      status: 'pendente',
    },
  ]);
  console.log('✔ Reajustes criados: 5 (3 aplicados + 2 pendentes)');

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log('\n─────────────────────────────────────────────────');
  console.log('Seed completo!\n');
  console.log('  URL:      http://localhost:8080/landlord');
  console.log('  Email:    admin@locacentral.com.br');
  console.log('  Senha:    Admin@123');
  console.log('\n  Dados de exemplo:');
  console.log('  - 1 realm (Arthur Levy Imóveis)');
  console.log('  - 4 proprietários');
  console.log('  - 5 modelos de contrato (1 inativo)');
  console.log('  - 7 imóveis (5 alugados + 2 disponíveis)');
  console.log('  - 6 inquilinos (5 ativos + 1 inativo)');
  console.log('  - 4 garantias (fiador, caução, seguro, capitalização)');
  console.log('  - ', charges.length, 'cobranças mensais (pago/pendente/vencido)');
  console.log('  - 5 reajustes de índice (3 aplicados + 2 pendentes)');
  console.log('─────────────────────────────────────────────────\n');

  await mongoose.disconnect();
}

seed().catch(err => { console.error('Erro no seed:', err); process.exit(1); });
