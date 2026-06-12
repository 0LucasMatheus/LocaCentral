import IndexAdjustment from '../models/indexadjustment.js';
import { Collections, ServiceError } from '@microrealestate/common';
import { getIndex } from '../integrations/indexes.js';
import moment from 'moment';

export async function pendingAdjustments(req, res) {
  const realm = req.realm;
  const adjustments = await IndexAdjustment.find({
    realmId: String(realm._id),
    status: 'pendente'
  }).sort({ createdAt: -1 });
  res.json(adjustments);
}

export async function applyAdjustment(req, res) {
  const realm = req.realm;
  const adj = await IndexAdjustment.findOne({
    _id: req.params.id,
    realmId: String(realm._id),
    status: 'pendente'
  });

  if (!adj) throw new ServiceError('adjustment not found or already applied', 404);

  const occupant = await Collections.Tenant.findOne({
    _id: adj.occupantId,
    realmId: String(realm._id)
  });

  if (!occupant) throw new ServiceError('tenant not found', 404);

  const prop = occupant.properties?.[0];
  if (!prop) throw new ServiceError('property not found', 404);

  const newRent = Math.round(adj.newRent * 100) / 100;

  await Collections.Tenant.updateOne(
    { _id: adj.occupantId, realmId: String(realm._id), 'properties.propertyId': prop.propertyId },
    { $set: { 'properties.$.rent': newRent } }
  );

  adj.status = 'aplicado';
  adj.appliedAt = new Date();
  await adj.save();

  res.json(adj);
}

export async function getIndexRates(req, res) {
  const period = req.query.period || moment().subtract(1, 'month').format('YYYY-MM');
  try {
    const [ipca, igpm] = await Promise.allSettled([
      getIndex('IPCA', period),
      getIndex('IGPM', period)
    ]);
    res.json({
      period,
      IPCA: ipca.status === 'fulfilled' ? ipca.value : null,
      IGPM: igpm.status === 'fulfilled' ? igpm.value : null
    });
  } catch (err) {
    res.json({ period, error: err.message });
  }
}

export async function checkAndCreateAdjustments(realmId) {
  const today = moment();
  const occupants = await Collections.Tenant.find({ realmId }).lean();

  for (const occupant of occupants) {
    const endMoment = moment(occupant.terminationDate || occupant.endDate);
    if (endMoment.isBefore(today, 'day')) continue;

    const lease = await Collections.Lease.findOne({
      _id: occupant.leaseId,
      realmId
    }).lean();

    if (!lease?.adjustmentIndex || !lease?.adjustmentMonth) continue;

    if (today.month() + 1 !== lease.adjustmentMonth) continue;

    const period = today.format('YYYY-MM');
    const exists = await IndexAdjustment.findOne({
      realmId,
      leaseId: String(occupant.leaseId),
      period
    });
    if (exists) continue;

    const rate = await getIndex(lease.adjustmentIndex, period).catch(() => null);
    const prop = occupant.properties?.[0];
    if (!prop) continue;

    const previousRent = prop.rent;
    const newRent = rate ? previousRent * (1 + rate / 100) : previousRent;

    await IndexAdjustment.create({
      realmId,
      leaseId: String(occupant.leaseId),
      occupantId: String(occupant._id),
      index: lease.adjustmentIndex,
      period,
      rate,
      previousRent,
      newRent,
      status: 'pendente'
    });
  }
}
