import mongoose from 'mongoose';

const IndexAdjustmentSchema = new mongoose.Schema(
  {
    realmId: { type: String, required: true, index: true },
    leaseId: { type: String, required: true, index: true },
    occupantId: { type: String, required: true },
    appliedAt: Date,
    index: {
      type: String,
      required: true,
      enum: ['IGPM', 'IPCA', 'INCC', 'IVAR', 'IGP-DI']
    },
    period: { type: String, required: true }, // "2026-05"
    rate: Number,
    previousRent: Number,
    newRent: Number,
    status: {
      type: String,
      enum: ['pendente', 'aplicado', 'cancelado'],
      default: 'pendente',
      index: true
    }
  },
  { timestamps: true }
);

export default mongoose.model('IndexAdjustment', IndexAdjustmentSchema);
