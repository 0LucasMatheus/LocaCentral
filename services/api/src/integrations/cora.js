import axios from 'axios';
import { Service } from '@microrealestate/common';

let _tokenCache = null;

function _getConfig() {
  try {
    return Service.getInstance().envConfig.getValues();
  } catch {
    return {};
  }
}

async function authenticate() {
  const { CORA_CLIENT_ID, CORA_CLIENT_SECRET, CORA_ENVIRONMENT } = _getConfig();
  const clientId = CORA_CLIENT_ID || process.env.CORA_CLIENT_ID;
  const clientSecret = CORA_CLIENT_SECRET || process.env.CORA_CLIENT_SECRET;
  const env = CORA_ENVIRONMENT || process.env.CORA_ENVIRONMENT || 'sandbox';

  if (!clientId || !clientSecret) {
    throw new Error('Cora credentials not configured');
  }

  if (_tokenCache && _tokenCache.expiresAt > Date.now()) {
    return _tokenCache.token;
  }

  const baseUrl =
    env === 'production'
      ? 'https://matls-clients.api.cora.com.br'
      : 'https://matls-clients.api.sandbox.cora.com.br';

  const resp = await axios.post(
    `${baseUrl}/token`,
    new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );

  _tokenCache = {
    token: resp.data.access_token,
    expiresAt: Date.now() + (resp.data.expires_in - 60) * 1000
  };

  return _tokenCache.token;
}

export async function createInvoice(chargeData) {
  const { CORA_ENVIRONMENT } = _getConfig();
  const env = CORA_ENVIRONMENT || process.env.CORA_ENVIRONMENT || 'sandbox';
  const baseUrl =
    env === 'production'
      ? 'https://matls-clients.api.cora.com.br'
      : 'https://matls-clients.api.sandbox.cora.com.br';

  const token = await authenticate();

  // Data limite para pagamento após o vencimento (padrão 5 dias)
  const validityDays = chargeData.boletoValidityDays ?? 5;
  const dueDate = new Date(chargeData.dueDate);
  const expirationDate = new Date(dueDate);
  expirationDate.setDate(expirationDate.getDate() + validityDays);
  const expirationDateStr = expirationDate.toISOString().split('T')[0];

  const payload = {
    code: chargeData.chargeId,
    services: [
      {
        name: 'Aluguel',
        amount: chargeData.totalAmount
      }
    ],
    payment_terms: {
      due_date: chargeData.dueDate,
      expiration_date: expirationDateStr,
      fine: { date: chargeData.dueDate, modality: 'FIXED', amount: 0 },
      interest: { modality: 'DAILY_PERCENTAGE', amount: 0.033 }
    },
    customer: {
      name: chargeData.payerName,
      email: chargeData.payerEmail,
      document: { identity: chargeData.payerDocument, type: 'CPF' },
      address: {
        street: chargeData.payerStreet || '',
        number: chargeData.payerNumber || 'S/N',
        city: chargeData.payerCity || '',
        state: chargeData.payerState || 'SP',
        zip_code: (chargeData.payerZip || '').replace(/\D/g, ''),
        country: 'BR'
      }
    }
  };

  const resp = await axios.post(`${baseUrl}/v2/invoices`, payload, {
    headers: { Authorization: `Bearer ${token}` }
  });

  return { boletoId: resp.data.id, boletoUrl: resp.data.bank_slip?.pdf_url };
}

export async function cancelInvoice(boletoId) {
  const { CORA_ENVIRONMENT } = _getConfig();
  const env = CORA_ENVIRONMENT || process.env.CORA_ENVIRONMENT || 'sandbox';
  const baseUrl =
    env === 'production'
      ? 'https://matls-clients.api.cora.com.br'
      : 'https://matls-clients.api.sandbox.cora.com.br';

  const token = await authenticate();
  await axios.delete(`${baseUrl}/v2/invoices/${boletoId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}
