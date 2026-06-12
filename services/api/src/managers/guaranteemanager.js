import Guarantee from '../models/guarantee.js';
import { ServiceError } from '@microrealestate/common';

export async function add(req, res) {
  const realm = req.realm;
  const leaseId = req.params.leaseId;
  const data = req.body;

  if (!data.type) throw new ServiceError('missing fields', 422);

  const guarantee = await Guarantee.create({
    ...data,
    leaseId,
    realmId: String(realm._id)
  });

  res.status(201).json(guarantee);
}

export async function update(req, res) {
  const realm = req.realm;
  const leaseId = req.params.leaseId;

  const guarantee = await Guarantee.findOneAndUpdate(
    { leaseId, realmId: String(realm._id) },
    req.body,
    { new: true, runValidators: true }
  );

  if (!guarantee) throw new ServiceError('guarantee not found', 404);
  res.json(guarantee);
}

export async function one(req, res) {
  const realm = req.realm;
  const leaseId = req.params.leaseId;

  const guarantee = await Guarantee.findOne({
    leaseId,
    realmId: String(realm._id),
    archived: false
  });

  res.json(guarantee || null);
}
