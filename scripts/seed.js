/**
 * Seed script — popula o banco com dados de exemplo para dev/teste.
 * Dropa o banco, recria tudo do zero.
 *
 * Como rodar:
 *   docker cp scripts/seed.js locacentral-api-1:/usr/app/seed.js
 *   docker exec locacentral-api-1 node seed.js
 *
 * Ou via wrapper: ./scripts/seed.sh
 *
 * Login após seed:
 *   Email: admin@locacentral.com.br
 *   Senha: Admin@123
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
  firstname: String,
  lastname: String,
  email: String,
  password: String,
  createdDate: Date,
});

const LeaseSchema = new mongoose.Schema({
  realmId: String,
  name: String,
  description: String,
  numberOfTerms: Number,
  timeRange: String,
  active: Boolean,
  stepperMode: { type: Boolean, default: false },
});

const PropertySchema = new mongoose.Schema({
  realmId: String,
  type: String,
  name: String,
  description: String,
  surface: Number,
  phone: String,
  digicode: String,
  address: { street1: String, street2: String, zipCode: String, city: String, state: String, country: String },
  price: Number,
});

const TenantSchema = new mongoose.Schema({
  realmId: String,
  name: String,
  isCompany: Boolean,
  company: String,
  manager: String,
  street1: String,
  street2: String,
  zipCode: String,
  city: String,
  country: String,
  contacts: [{ contact: String, phone: String, email: String }],
  reference: String,
  contract: String,
  leaseId: String,
  beginDate: Date,
  endDate: Date,
  terminationDate: Date,
  properties: mongoose.Schema.Types.Mixed,
  rents: mongoose.Schema.Types.Mixed,
  isVat: Boolean,
  vatRatio: Number,
  discount: Number,
  guaranty: Number,
  guarantyPayback: Number,
  stepperMode: { type: Boolean, default: false },
});

const Realm    = mongoose.model('Realm',    RealmSchema);
const Account  = mongoose.model('Account',  AccountSchema);
const Lease    = mongoose.model('Lease',    LeaseSchema);
const Property = mongoose.model('Property', PropertySchema);
const Tenant   = mongoose.model('Occupant', TenantSchema);

// ─── Rent computation ────────────────────────────────────────────────────────

function computeRents(beginDate, endDate, rentAmount, expenses = [], paidUntil = null) {
  const rents = {};
  const begin = moment(beginDate);
  const end   = moment(endDate);
  let current = begin.clone();

  while (current.isSameOrBefore(end, 'month')) {
    const term = Number(current.format('YYYYMM') + '00');
    const expensesTotal = expenses.reduce((s, e) => s + (e.amount || 0), 0);
    const isPaid = paidUntil ? current.isSameOrBefore(moment(paidUntil), 'month') : false;

    rents[term] = {
      term,
      month: current.month() + 1,
      year:  current.year(),
      preTaxAmounts: [{ description: 'Aluguel', amount: rentAmount }],
      charges: expenses.map(e => ({ description: e.title, amount: e.amount })),
      discounts: [],
      debts: [],
      vats: [],
      payments: isPaid
        ? [{ date: current.clone().date(5).toDate(), amount: rentAmount + expensesTotal, type: 'transfer', reference: '' }]
        : [],
      description: '',
      total: {
        preTaxAmount: rentAmount,
        charges:      expensesTotal,
        vat:          0,
        discount:     0,
        debts:        0,
        balance:      isPaid ? 0 : -(rentAmount + expensesTotal),
        grandTotal:   rentAmount + expensesTotal,
        payment:      isPaid ? rentAmount + expensesTotal : 0,
      },
    };

    current.add(1, 'month');
  }
  return rents;
}

// ─── Seed data ───────────────────────────────────────────────────────────────

async function seed() {
  await mongoose.connect(MONGO_URL);
  console.log('✔ Conectado ao MongoDB:', MONGO_URL);

  // Drop tudo
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
    companyInfo: {
      name: 'Arthur Levy Imóveis Ltda',
      legalStructure: 'Ltda',
      legalRepresentative: 'Arthur Levy',
      capital: 100000,
      ein: '12.345.678/0001-90',
    },
    locale: 'pt-BR',
    currency: 'BRL',
  });
  console.log('✔ Realm criado:', realm.name);

  const realmId = String(realm._id);

  // ── Account (login) ────────────────────────────────────────────────────────
  const passwordHash = bcrypt.hashSync('Admin@123', 10);
  await Account.create({
    firstname: 'Admin',
    lastname: 'LocaCentral',
    email: 'admin@locacentral.com.br',
    password: passwordHash,
    createdDate: new Date(),
  });
  console.log('✔ Usuário admin criado — email: admin@locacentral.com.br / senha: Admin@123');

  // ── Leases ─────────────────────────────────────────────────────────────────
  const [leaseRes30, leaseRes12, leaseCom24] = await Lease.insertMany([
    { realmId, name: 'Residencial 30 Meses', description: 'Contrato residencial padrão — 30 meses', numberOfTerms: 30, timeRange: 'months', active: true },
    { realmId, name: 'Residencial 12 Meses', description: 'Contrato residencial curto prazo — 12 meses', numberOfTerms: 12, timeRange: 'months', active: true },
    { realmId, name: 'Comercial 24 Meses',   description: 'Contrato comercial — 24 meses',              numberOfTerms: 24, timeRange: 'months', active: true },
  ]);
  console.log('✔ Contratos tipo criados');

  // ── Properties ─────────────────────────────────────────────────────────────
  const props = await Property.insertMany([
    {
      realmId, type: 'house', name: 'Casa das Flores', surface: 120,
      description: 'Casa com 3 quartos, garagem, quintal',
      address: { street1: 'Rua das Flores, 45', zipCode: '08673-100', city: 'Suzano', state: 'SP', country: 'BR' },
      price: 2200,
    },
    {
      realmId, type: 'apartment', name: 'Apto Yunes', surface: 68,
      description: 'Apartamento 2 quartos, 1 vaga, condomínio fechado',
      address: { street1: 'Av. Miguel Yunes, 890', street2: 'Apto 42', zipCode: '08613-010', city: 'Suzano', state: 'SP', country: 'BR' },
      price: 1800,
    },
    {
      realmId, type: 'house', name: 'Casa Bela Vista', surface: 90,
      description: 'Casa 2 quartos, quintal, edícula',
      address: { street1: 'Rua Bela Vista, 12', zipCode: '08560-000', city: 'Poá', state: 'SP', country: 'BR' },
      price: 1500,
    },
    {
      realmId, type: 'apartment', name: 'Apto Centro Mogi', surface: 75,
      description: 'Apartamento 3 quartos, 2 vagas, piscina',
      address: { street1: 'Rua São Paulo, 234', street2: 'Apto 101', zipCode: '08780-000', city: 'Mogi das Cruzes', state: 'SP', country: 'BR' },
      price: 2500,
    },
    {
      realmId, type: 'commercial', name: 'Loja Av. Paulista Mogi', surface: 140,
      description: 'Loja térrea com depósito, esquina',
      address: { street1: 'Av. Benedito Tobias, 1000', zipCode: '08790-000', city: 'Mogi das Cruzes', state: 'SP', country: 'BR' },
      price: 3500,
    },
    {
      realmId, type: 'house', name: 'Casa das Acácias', surface: 100,
      description: 'Casa 3 quartos, garagem 2 carros — disponível',
      address: { street1: 'Rua das Acácias, 78', zipCode: '08673-200', city: 'Suzano', state: 'SP', country: 'BR' },
      price: 1900,
    },
    {
      realmId, type: 'apartment', name: 'Apto XV Novembro', surface: 55,
      description: 'Studio reformado, próximo ao centro — disponível',
      address: { street1: 'Rua XV de Novembro, 56', street2: 'Apto 23', zipCode: '08673-050', city: 'Suzano', state: 'SP', country: 'BR' },
      price: 1400,
    },
  ]);
  console.log('✔ Imóveis criados:', props.length);

  const [pFlores, pYunes, pBelaVista, pMogi, pLoja] = props;

  // ── Tenants ────────────────────────────────────────────────────────────────
  // 1. João da Silva — residencial 30m, em dia
  const beginJoao  = moment('2023-06-01');
  const endJoao    = beginJoao.clone().add(30, 'months');
  const paidJoao   = moment().startOf('month');
  const expensesJoao = [
    { title: 'IPTU', amount: 120 },
    { title: 'Condomínio', amount: 180 },
  ];
  await Tenant.create({
    realmId,
    name: 'João da Silva',
    street1: 'Rua das Flores, 45', zipCode: '08673-100', city: 'Suzano', country: 'BR',
    contacts: [{ contact: 'João da Silva', phone: '(11) 98765-4321', email: 'joao.silva@email.com' }],
    reference: 'JDS-001',
    contract: String(leaseRes30._id),
    leaseId: String(leaseRes30._id),
    beginDate: beginJoao.toDate(),
    endDate: endJoao.toDate(),
    properties: [{
      propertyId: String(pFlores._id),
      property: { ...pFlores.toObject() },
      rent: 2200,
      expenses: expensesJoao,
      entryDate: beginJoao.toDate(),
    }],
    rents: computeRents(beginJoao, endJoao, 2200, expensesJoao, paidJoao.toDate()),
    guaranty: 6600,
    stepperMode: false,
  });

  // 2. Maria Santos — residencial 12m, 1 mês em atraso
  const beginMaria = moment('2024-03-01');
  const endMaria   = beginMaria.clone().add(12, 'months');
  const paidMaria  = moment().subtract(2, 'months').startOf('month');
  const expensesMaria = [{ title: 'Água', amount: 85 }];
  await Tenant.create({
    realmId,
    name: 'Maria Santos',
    street1: 'Av. Miguel Yunes, 890', zipCode: '08613-010', city: 'Suzano', country: 'BR',
    contacts: [{ contact: 'Maria Santos', phone: '(11) 97654-3210', email: 'maria.santos@email.com' }],
    reference: 'MAS-002',
    contract: String(leaseRes12._id),
    leaseId: String(leaseRes12._id),
    beginDate: beginMaria.toDate(),
    endDate: endMaria.toDate(),
    properties: [{
      propertyId: String(pYunes._id),
      property: { ...pYunes.toObject() },
      rent: 1800,
      expenses: expensesMaria,
      entryDate: beginMaria.toDate(),
    }],
    rents: computeRents(beginMaria, endMaria, 1800, expensesMaria, paidMaria.toDate()),
    guaranty: 5400,
    stepperMode: false,
  });

  // 3. Pedro Oliveira — residencial 30m, em dia
  const beginPedro = moment('2023-08-01');
  const endPedro   = beginPedro.clone().add(30, 'months');
  const paidPedro  = moment().startOf('month');
  await Tenant.create({
    realmId,
    name: 'Pedro Oliveira',
    street1: 'Rua Bela Vista, 12', zipCode: '08560-000', city: 'Poá', country: 'BR',
    contacts: [{ contact: 'Pedro Oliveira', phone: '(11) 96543-2109', email: 'pedro.oliveira@email.com' }],
    reference: 'POL-003',
    contract: String(leaseRes30._id),
    leaseId: String(leaseRes30._id),
    beginDate: beginPedro.toDate(),
    endDate: endPedro.toDate(),
    properties: [{
      propertyId: String(pBelaVista._id),
      property: { ...pBelaVista.toObject() },
      rent: 1500,
      expenses: [],
      entryDate: beginPedro.toDate(),
    }],
    rents: computeRents(beginPedro, endPedro, 1500, [], paidPedro.toDate()),
    guaranty: 4500,
    stepperMode: false,
  });

  // 4. Ana Costa — residencial 12m, em dia
  const beginAna = moment('2024-10-01');
  const endAna   = beginAna.clone().add(12, 'months');
  const paidAna  = moment().startOf('month');
  const expensesAna = [
    { title: 'Condomínio', amount: 350 },
    { title: 'IPTU', amount: 200 },
  ];
  await Tenant.create({
    realmId,
    name: 'Ana Costa',
    street1: 'Rua São Paulo, 234', zipCode: '08780-000', city: 'Mogi das Cruzes', country: 'BR',
    contacts: [{ contact: 'Ana Costa', phone: '(11) 95432-1098', email: 'ana.costa@email.com' }],
    reference: 'ACO-004',
    contract: String(leaseRes12._id),
    leaseId: String(leaseRes12._id),
    beginDate: beginAna.toDate(),
    endDate: endAna.toDate(),
    properties: [{
      propertyId: String(pMogi._id),
      property: { ...pMogi.toObject() },
      rent: 2500,
      expenses: expensesAna,
      entryDate: beginAna.toDate(),
    }],
    rents: computeRents(beginAna, endAna, 2500, expensesAna, paidAna.toDate()),
    guaranty: 7500,
    stepperMode: false,
  });

  // 5. Empresa ABC Comércio Ltda — comercial 24m, em dia
  const beginABC = moment('2024-01-01');
  const endABC   = beginABC.clone().add(24, 'months');
  const paidABC  = moment().startOf('month');
  const expensesABC = [
    { title: 'IPTU', amount: 420 },
    { title: 'Condomínio', amount: 280 },
  ];
  await Tenant.create({
    realmId,
    name: 'ABC Comércio Ltda',
    isCompany: true,
    company: 'ABC Comércio Ltda',
    manager: 'Carlos Mendes',
    street1: 'Av. Benedito Tobias, 1000', zipCode: '08790-000', city: 'Mogi das Cruzes', country: 'BR',
    contacts: [
      { contact: 'Carlos Mendes', phone: '(11) 94321-0987', email: 'carlos@abccomercio.com.br' },
      { contact: 'Financeiro ABC',  phone: '(11) 4745-2222', email: 'financeiro@abccomercio.com.br' },
    ],
    reference: 'ABC-005',
    contract: String(leaseCom24._id),
    leaseId: String(leaseCom24._id),
    beginDate: beginABC.toDate(),
    endDate: endABC.toDate(),
    properties: [{
      propertyId: String(pLoja._id),
      property: { ...pLoja.toObject() },
      rent: 3500,
      expenses: expensesABC,
      entryDate: beginABC.toDate(),
    }],
    rents: computeRents(beginABC, endABC, 3500, expensesABC, paidABC.toDate()),
    guaranty: 10500,
    stepperMode: false,
  });

  console.log('✔ Inquilinos criados: 5');
  console.log('\n─────────────────────────────────────────────────');
  console.log('Seed concluído!\n');
  console.log('  URL:   http://localhost:8080/landlord');
  console.log('  Email: admin@locacentral.com.br');
  console.log('  Senha: Admin@123');
  console.log('─────────────────────────────────────────────────\n');

  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('Erro no seed:', err);
  process.exit(1);
});
