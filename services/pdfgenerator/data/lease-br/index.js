import { Collections } from '@microrealestate/common';
import fileUrl from 'file-url';
import moment from 'moment';
import path from 'path';
import { Service } from '@microrealestate/common';
import mongoose from 'mongoose';

function _formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}

function _formatDate(d) {
  return d ? moment(d).format('DD/MM/YYYY') : '';
}

export async function get(params) {
  const { TEMPLATES_DIRECTORY } = Service.getInstance().envConfig.getValues();
  const { tenantId } = params;

  const dbTenant = await Collections.Tenant.findById(tenantId)
    .populate('realmId')
    .populate('leaseId')
    .populate('properties.propertyId')
    .lean();

  if (!dbTenant) throw new Error(`tenant ${tenantId} not found`);

  const landlord = dbTenant.realmId || {};
  landlord.name = (landlord.isCompany ? landlord.companyInfo?.name : landlord.contacts?.[0]?.name) || landlord.name || '';
  landlord.hasAddress = !!landlord.addresses?.length;

  const property = dbTenant.properties?.[0]?.propertyId || dbTenant.properties?.[0]?.property || {};
  const rentAmount = dbTenant.properties?.[0]?.rent || 0;
  const expenses = dbTenant.properties?.[0]?.expenses || [];
  const expensesTotal = expenses.reduce((s, e) => s + (e.amount || 0), 0);

  const leaseModel = dbTenant.leaseId || {};

  // Try to find owner via ownerIdBr field
  let owner = null;
  if (property.ownerIdBr) {
    try {
      const OwnerModel = mongoose.models['Owner'];
      if (OwnerModel) {
        owner = await OwnerModel.findById(property.ownerIdBr).lean();
      }
    } catch (e) {
      // owner not found
    }
  }

  // Try to find guarantee
  let guarantee = null;
  try {
    const GuaranteeModel = mongoose.models['Guarantee'];
    if (GuaranteeModel) {
      guarantee = await GuaranteeModel.findOne({
        leaseId: String(dbTenant.leaseId?._id || dbTenant.leaseId),
        realmId: String(dbTenant.realmId?._id || dbTenant.realmId)
      }).lean();
    }
  } catch (e) {
    // guarantee not found
  }

  const tenant = {
    name: dbTenant.isCompany ? dbTenant.company : dbTenant.name,
    cpf: dbTenant.cpf,
    rg: dbTenant.rg,
    rgIssuer: dbTenant.rgIssuer,
    nationality: dbTenant.nationality,
    profession: dbTenant.profession,
    maritalStatus: dbTenant.maritalStatus,
    street1: dbTenant.street1,
    city: dbTenant.city,
    contacts: dbTenant.contacts,
    reference: dbTenant.reference,
  };

  const lease = {
    reference: dbTenant.reference,
    contractType: leaseModel.contractType,
    adjustmentIndex: leaseModel.adjustmentIndex,
    penaltyMonths: leaseModel.penaltyMonths,
    numberOfTerms: leaseModel.numberOfTerms,
    name: leaseModel.name,
  };

  const cssUrl = fileUrl(path.join(TEMPLATES_DIRECTORY, 'css', 'print.css'));
  const logoUrl = fileUrl(path.join(TEMPLATES_DIRECTORY, 'img', 'logo.png'));

  return {
    landlord,
    tenant,
    property,
    owner,
    guarantee,
    lease,
    rentFormatted: _formatCurrency(rentAmount),
    totalFormatted: _formatCurrency(rentAmount + expensesTotal),
    beginDate: _formatDate(dbTenant.beginDate),
    endDate: _formatDate(dbTenant.endDate),
    today: moment().format('DD [de] MMMM [de] YYYY'),
    numberOfTerms: leaseModel.numberOfTerms,
    adjustmentIndex: leaseModel.adjustmentIndex,
    penaltyMonths: leaseModel.penaltyMonths,
    cssUrl,
    logoUrl,
  };
}
