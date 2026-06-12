import { Collections, Service, ServiceError } from '@microrealestate/common';
import axios from 'axios';

export async function generateContractPdf(req, res) {
  const realm = req.realm;
  const tenantId = req.params.id;

  const tenant = await Collections.Tenant.findOne({
    _id: tenantId,
    realmId: String(realm._id)
  }).lean();

  if (!tenant) throw new ServiceError('tenant not found', 404);

  const { PDFGENERATOR_URL } = Service.getInstance().envConfig.getValues();

  try {
    const pdfResp = await axios.post(
      `${PDFGENERATOR_URL}/pdfgenerator/lease-br/${tenantId}`,
      {},
      {
        headers: {
          authorization: req.headers.authorization,
          organizationid: req.headers.organizationid || String(realm._id),
          'Accept-Language': req.headers['accept-language'] || 'pt-BR'
        },
        responseType: 'arraybuffer'
      }
    );

    res.set('Content-Type', 'application/pdf');
    res.set('Content-Disposition', `attachment; filename="contrato-${tenantId}.pdf"`);
    res.send(pdfResp.data);
  } catch (err) {
    const msg = err.response?.data ? Buffer.from(err.response.data).toString() : err.message;
    throw new ServiceError(`PDF generation failed: ${msg}`, 500);
  }
}
