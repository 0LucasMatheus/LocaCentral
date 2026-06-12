import mongoose from 'mongoose';

const ChargeItemSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['aluguel', 'iptu', 'condominio', 'agua', 'luz', 'multa', 'desconto', 'outro'],
      required: true
    },
    description: String,
    amount: { type: Number, required: true }
  },
  { _id: false }
);

const MonthlyChargeSchema = new mongoose.Schema(
  {
    realmId: { type: String, required: true, index: true },
    leaseId: { type: String, required: true, index: true },
    occupantId: { type: String, required: true, index: true },
    propertyId: { type: String, required: true },
    period: { type: String, required: true, index: true }, // "2026-06"
    dueDate: Date,
    items: [ChargeItemSchema],
    totalAmount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['pendente', 'emitido', 'pago', 'vencido', 'cancelado'],
      default: 'pendente',
      index: true
    },
    boletoId: String,
    boletoUrl: String,
    boletoBarcode: String,
    paidAt: Date,
    paidAmount: Number,
    paymentMethod: {
      type: String,
      enum: ['boleto', 'pix', 'transferencia', 'dinheiro', 'cheque']
    },
    paymentReference: String
  },
  { timestamps: true }
);

MonthlyChargeSchema.pre('save', function (next) {
  this.totalAmount = this.items.reduce((sum, item) => sum + (item.amount || 0), 0);
  next();
});

export default mongoose.model('MonthlyCharge', MonthlyChargeSchema);
