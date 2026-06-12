import mongoose from 'mongoose';

const OwnerSchema = new mongoose.Schema(
  {
    realmId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    cpf: String,
    cnpj: String,
    rg: String,
    email: String,
    phone: String,
    address: {
      _id: false,
      street: String,
      number: String,
      complement: String,
      neighborhood: String,
      city: String,
      state: String,
      zipCode: String
    },
    bankAccount: {
      _id: false,
      bank: String,
      agency: String,
      account: String,
      accountType: { type: String, enum: ['corrente', 'poupanca'] },
      pixKey: String
    },
    receiptPreference: { type: String, enum: ['boleto', 'pix', 'transferencia', 'cheque'] },
    archived: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export default mongoose.model('Owner', OwnerSchema);
