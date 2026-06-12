import MonthlyCharge from '../models/monthlycharge.js';
import { Collections, ServiceError } from '@microrealestate/common';
import moment from 'moment';

function _buildItems(occupant) {
  const items = [];
  const property = occupant.properties?.[0];
  if (!property) return items;

  items.push({
    type: 'aluguel',
    description: 'Aluguel',
    amount: property.rent || 0
  });

  (property.expenses || []).forEach((exp) => {
    const type = _guessExpenseType(exp.title);
    items.push({ type, description: exp.title, amount: exp.amount || 0 });
  });

  return items;
}

function _guessExpenseType(title = '') {
  const t = title.toLowerCase();
  if (t.includes('iptu')) return 'iptu';
  if (t.includes('cond')) return 'condominio';
  if (t.includes('água') || t.includes('agua')) return 'agua';
  if (t.includes('luz') || t.includes('energ')) return 'luz';
  return 'outro';
}

export async function generateMonthlyChargesAuto(realmId, period) {
  const p = period || moment().format('YYYY-MM');
  const [year, month] = p.split('-').map(Number);
  const dueDate = moment({ year, month: month - 1, day: 5 }).toDate();

  const occupants = await Collections.Tenant.find({ realmId }).lean();
  const now = moment();
  const activeOccupants = occupants.filter((o) => {
    const end = moment(o.terminationDate || o.endDate);
    return end.isSameOrAfter(now, 'month');
  });

  for (const occupant of activeOccupants) {
    const prop = occupant.properties?.[0];
    if (!prop) continue;
    const exists = await MonthlyCharge.findOne({ realmId, occupantId: String(occupant._id), period: p });
    if (exists) continue;
    const items = _buildItems(occupant);
    await MonthlyCharge.create({
      realmId,
      leaseId: String(occupant.leaseId),
      occupantId: String(occupant._id),
      propertyId: prop.propertyId,
      period: p,
      dueDate,
      items,
      status: 'pendente'
    });
  }
}

export async function generateMonthlyCharges(req, res) {
  const realm = req.realm;
  const realmId = String(realm._id);
  const period = req.body.period || moment().format('YYYY-MM');
  const [year, month] = period.split('-').map(Number);
  const dueDay = req.body.dueDay || 5;
  const dueDate = moment({ year, month: month - 1, day: dueDay }).toDate();

  const occupants = await Collections.Tenant.find({ realmId }).lean();
  const now = moment();
  const activeOccupants = occupants.filter((o) => {
    const end = moment(o.terminationDate || o.endDate);
    return end.isSameOrAfter(now, 'month');
  });

  const created = [];
  const skipped = [];

  for (const occupant of activeOccupants) {
    const prop = occupant.properties?.[0];
    if (!prop) continue;

    const exists = await MonthlyCharge.findOne({
      realmId,
      occupantId: String(occupant._id),
      period
    });

    if (exists) {
      skipped.push(String(occupant._id));
      continue;
    }

    const items = _buildItems(occupant);
    const charge = await MonthlyCharge.create({
      realmId,
      leaseId: String(occupant.leaseId),
      occupantId: String(occupant._id),
      propertyId: prop.propertyId,
      period,
      dueDate,
      items,
      status: 'pendente'
    });
    created.push(charge._id);
  }

  res.json({ period, created: created.length, skipped: skipped.length });
}

export async function all(req, res) {
  const realm = req.realm;
  const realmId = String(realm._id);
  const filter = { realmId };

  if (req.query.period) filter.period = req.query.period;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.occupantId) filter.occupantId = req.query.occupantId;
  if (req.query.propertyId) filter.propertyId = req.query.propertyId;

  const charges = await MonthlyCharge.find(filter).sort({ period: -1, createdAt: -1 }).lean();

  const occupantIds = [...new Set(charges.map((c) => c.occupantId).filter(Boolean))];
  const propertyIds = [...new Set(charges.map((c) => c.propertyId).filter(Boolean))];

  const [occupants, properties] = await Promise.all([
    Collections.Tenant.find({ realmId, _id: { $in: occupantIds } }).lean(),
    Collections.Property.find({ realmId, _id: { $in: propertyIds } }).lean()
  ]);

  const occupantMap = Object.fromEntries(occupants.map((o) => [String(o._id), o]));
  const propertyMap = Object.fromEntries(properties.map((p) => [String(p._id), p]));

  const enriched = charges.map((c) => {
    const occupant = occupantMap[c.occupantId];
    const property = propertyMap[c.propertyId];
    return {
      ...c,
      occupantName: occupant ? `${occupant.name} ${occupant.lastName || ''}`.trim() : null,
      propertyName: property ? (property.name || property.type || property._id) : null
    };
  });

  res.json(enriched);
}

export async function one(req, res) {
  const realm = req.realm;
  const charge = await MonthlyCharge.findOne({
    _id: req.params.id,
    realmId: String(realm._id)
  });
  if (!charge) throw new ServiceError('charge not found', 404);
  res.json(charge);
}

export async function update(req, res) {
  const realm = req.realm;
  const charge = await MonthlyCharge.findOne({
    _id: req.params.id,
    realmId: String(realm._id)
  });
  if (!charge) throw new ServiceError('charge not found', 404);

  if (req.body.items) charge.items = req.body.items;
  if (req.body.dueDate) charge.dueDate = req.body.dueDate;
  if (req.body.status) charge.status = req.body.status;

  await charge.save();
  res.json(charge);
}

export async function addItem(req, res) {
  const realm = req.realm;
  const charge = await MonthlyCharge.findOne({
    _id: req.params.id,
    realmId: String(realm._id)
  });
  if (!charge) throw new ServiceError('charge not found', 404);

  charge.items.push(req.body);
  await charge.save();
  res.json(charge);
}

export async function registerPayment(req, res) {
  const realm = req.realm;
  const { paidAmount, paymentMethod, paymentReference, paidAt } = req.body;

  const charge = await MonthlyCharge.findOne({
    _id: req.params.id,
    realmId: String(realm._id)
  });
  if (!charge) throw new ServiceError('charge not found', 404);

  charge.status = 'pago';
  charge.paidAmount = paidAmount || charge.totalAmount;
  charge.paymentMethod = paymentMethod || 'transferencia';
  charge.paymentReference = paymentReference;
  charge.paidAt = paidAt ? new Date(paidAt) : new Date();

  await charge.save();
  res.json(charge);
}
