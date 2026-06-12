import Owner from '../models/owner.js';
import { Collections } from '@microrealestate/common';
import { ServiceError } from '@microrealestate/common';

export async function add(req, res) {
  const realm = req.realm;
  const data = req.body;

  if (!data.name) {
    throw new ServiceError('missing fields', 422);
  }

  const owner = await Owner.create({ ...data, realmId: String(realm._id) });
  res.status(201).json(owner);
}

export async function update(req, res) {
  const realm = req.realm;
  const ownerId = req.params.id;

  const owner = await Owner.findOneAndUpdate(
    { _id: ownerId, realmId: String(realm._id) },
    req.body,
    { new: true, runValidators: true }
  );

  if (!owner) throw new ServiceError('owner not found', 404);
  res.json(owner);
}

export async function remove(req, res) {
  const realm = req.realm;
  const ownerId = req.params.id;

  const owner = await Owner.findOneAndUpdate(
    { _id: ownerId, realmId: String(realm._id) },
    { archived: true },
    { new: true }
  );

  if (!owner) throw new ServiceError('owner not found', 404);
  res.json(owner);
}

export async function all(req, res) {
  const realm = req.realm;
  const filter = { realmId: String(realm._id) };
  if (req.query.includeArchived !== 'true') filter.archived = false;

  const owners = await Owner.find(filter).sort({ name: 1 });
  res.json(owners);
}

export async function one(req, res) {
  const realm = req.realm;
  const owner = await Owner.findOne({ _id: req.params.id, realmId: String(realm._id) });
  if (!owner) throw new ServiceError('owner not found', 404);
  res.json(owner);
}

export async function properties(req, res) {
  const realm = req.realm;
  const ownerId = req.params.id;

  const props = await Collections.Property.find({
    realmId: String(realm._id),
    ownerIdBr: ownerId
  }).lean();

  res.json(props);
}
