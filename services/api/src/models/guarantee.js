import mongoose from 'mongoose';

const GuaranteeSchema = new mongoose.Schema(
  {
    realmId: { type: String, required: true, index: true },
    leaseId: { type: String, required: true, index: true },
    type: {
      type: String,
      required: true,
      enum: ['fiador', 'caucao', 'seguro_fianca', 'titulo_capitalizacao']
    },
    // Fiador
    guarantorName: String,
    guarantorCpf: String,
    guarantorRg: String,
    guarantorPhone: String,
    guarantorEmail: String,
    guarantorAddress: String,
    guarantorSpouseName: String,
    guarantorSpouseCpf: String,
    // Caução
    cautionValue: Number,
    cautionDepositDate: Date,
    cautionBankAccount: String,
    // Seguro fiança
    insuranceCompany: String,
    insurancePolicyNumber: String,
    insuranceExpiry: Date,
    insuranceValue: Number,
    // Título capitalização
    capitalizationNumber: String,
    capitalizationValue: Number,
    capitalizationCompany: String,
    archived: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export default mongoose.model('Guarantee', GuaranteeSchema);
