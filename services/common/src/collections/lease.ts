import { CollectionTypes } from '@microrealestate/types';
import mongoose from 'mongoose';
import Realm from './realm.js';

const LeaseSchema = new mongoose.Schema<CollectionTypes.Lease>({
  realmId: { type: String, ref: Realm },
  name: String,
  description: String,
  numberOfTerms: Number,
  timeRange: { type: String, enum: ['days', 'weeks', 'months', 'years'] },
  active: Boolean,

  // brasil — campos contratuais
  contractType: { type: String, enum: ['determinado', 'indeterminado'], default: 'determinado' },
  adjustmentIndex: { type: String, enum: ['IGPM', 'IPCA', 'INCC', 'IVAR', 'IGP-DI'] },
  adjustmentMonth: Number,
  penaltyMonths: { type: Number, default: 3 },
  adminFeePercent: Number,
  guaranteeType: { type: String, enum: ['fiador', 'caucao', 'seguro_fianca', 'titulo_capitalizacao'] },
  // prazo de vencimento
  dueDay: { type: Number, default: 5 },                          // dia do mês ou Nth dia útil
  dueType: { type: String, enum: ['fixo', 'util'], default: 'fixo' }, // dia fixo ou dia útil
  boletoValidityDays: { type: Number, default: 5 },              // dias após vencimento que o boleto ainda é pagável
  // ui state
  stepperMode: { type: Boolean, default: false }
});

export default mongoose.model<CollectionTypes.Lease>('Lease', LeaseSchema);
