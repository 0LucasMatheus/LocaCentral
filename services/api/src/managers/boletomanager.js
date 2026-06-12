import MonthlyCharge from '../models/monthlycharge.js';
import { Collections, Service, ServiceError } from '@microrealestate/common';
import { createInvoice } from '../integrations/cora.js';
import axios from 'axios';

export async function emitBoleto(req, res) {
  const realm = req.realm;
  const charge = await MonthlyCharge.findOne({
    _id: req.params.id,
    realmId: String(realm._id)
  });

  if (!charge) throw new ServiceError('charge not found', 404);
  if (charge.status === 'pago') throw new ServiceError('charge already paid', 409);
  if (charge.boletoId) throw new ServiceError('boleto already issued', 409);

  const occupant = await Collections.Tenant.findById(charge.occupantId).lean();
  if (!occupant) throw new ServiceError('tenant not found', 404);

  const contact = occupant.contacts?.[0] || {};
  const invoiceData = {
    chargeId: String(charge._id),
    totalAmount: charge.totalAmount,
    dueDate: charge.dueDate
      ? charge.dueDate.toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
    payerName: occupant.name,
    payerEmail: contact.email || '',
    payerDocument: occupant.cpf || '',
    payerStreet: occupant.street1 || '',
    payerNumber: 'S/N',
    payerCity: occupant.city || '',
    payerState: 'SP',
    payerZip: occupant.zipCode || ''
  };

  const { boletoId, boletoUrl } = await createInvoice(invoiceData);

  charge.boletoId = boletoId;
  charge.boletoUrl = boletoUrl;
  charge.status = 'emitido';
  await charge.save();

  // Envia email ao inquilino com link do boleto
  try {
    const { EMAILER_URL } = Service.getInstance().envConfig.getValues();
    await axios.post(
      `${EMAILER_URL}/emails`,
      {
        to: contact.email,
        subject: `Boleto de aluguel — ${charge.period}`,
        html: `<p>Olá ${occupant.name},</p><p>Seu boleto está disponível: <a href="${boletoUrl}">${boletoUrl}</a></p><p>Vencimento: ${invoiceData.dueDate}</p><p>Valor: R$ ${charge.totalAmount.toFixed(2)}</p>`
      },
      { headers: { authorization: req.headers.authorization } }
    );
  } catch (emailErr) {
    // email failure doesn't block the boleto
  }

  res.json(charge);
}

export async function handleCoraWebhook(req, res) {
  const event = req.body;

  if (event.type !== 'INVOICE_PAID') {
    return res.sendStatus(200);
  }

  const boletoId = event.data?.id;
  if (!boletoId) return res.sendStatus(200);

  const charge = await MonthlyCharge.findOne({ boletoId });
  if (!charge) return res.sendStatus(200);

  charge.status = 'pago';
  charge.paidAt = new Date(event.data.paid_at || Date.now());
  charge.paidAmount = event.data.amount / 100;
  charge.paymentMethod = 'boleto';
  await charge.save();

  res.sendStatus(200);
}
