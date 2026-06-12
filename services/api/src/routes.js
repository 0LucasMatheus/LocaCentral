import * as accountingManager from './managers/accountingmanager.js';
import * as dashboardManager from './managers/dashboardmanager.js';
import * as emailManager from './managers/emailmanager.js';
import * as leaseManager from './managers/leasemanager.js';
import * as occupantManager from './managers/occupantmanager.js';
import * as propertyManager from './managers/propertymanager.js';
import * as realmManager from './managers/realmmanager.js';
import * as rentManager from './managers/rentmanager.js';
import * as ownerManager from './managers/ownermanager.js';
import * as guaranteeManager from './managers/guaranteemanager.js';
import * as monthlyBillingManager from './managers/monthlybillingmanager.js';
import * as indexAdjustmentManager from './managers/indexadjustmentmanager.js';
import * as boletoManager from './managers/boletomanager.js';
import { Middlewares, Service } from '@microrealestate/common';
import express from 'express';

export default function routes() {
  const { ACCESS_TOKEN_SECRET } = Service.getInstance().envConfig.getValues();
  const router = express.Router();
  router.use(
    Middlewares.needAccessToken(ACCESS_TOKEN_SECRET),
    Middlewares.checkOrganization(),
    Middlewares.notRoles(['tenant'])
  );

  // ── Realms ──────────────────────────────────────────────────────────────────
  const realmsRouter = express.Router();
  realmsRouter.get('/', realmManager.all);
  realmsRouter.get('/:id', realmManager.one);
  realmsRouter.post('/', Middlewares.asyncWrapper(realmManager.add));
  realmsRouter.patch('/:id', Middlewares.asyncWrapper(realmManager.update));
  router.use('/realms', realmsRouter);

  // ── Dashboard ───────────────────────────────────────────────────────────────
  const dashboardRouter = express.Router();
  dashboardRouter.get('/', Middlewares.asyncWrapper(dashboardManager.all));
  router.use('/dashboard', dashboardRouter);

  // ── Leases ──────────────────────────────────────────────────────────────────
  const leasesRouter = express.Router();
  leasesRouter.get('/', Middlewares.asyncWrapper(leaseManager.all));
  leasesRouter.get('/:id', Middlewares.asyncWrapper(leaseManager.one));
  leasesRouter.post('/', Middlewares.asyncWrapper(leaseManager.add));
  leasesRouter.patch('/:id', Middlewares.asyncWrapper(leaseManager.update));
  leasesRouter.delete('/:ids', Middlewares.asyncWrapper(leaseManager.remove));
  router.use('/leases', leasesRouter);

  // ── Tenants (Occupants) ─────────────────────────────────────────────────────
  const occupantsRouter = express.Router();
  occupantsRouter.get('/', Middlewares.asyncWrapper(occupantManager.all));
  occupantsRouter.get('/:id', Middlewares.asyncWrapper(occupantManager.one));
  occupantsRouter.post('/', Middlewares.asyncWrapper(occupantManager.add));
  occupantsRouter.patch('/:id', Middlewares.asyncWrapper(occupantManager.update));
  occupantsRouter.delete('/:ids', Middlewares.asyncWrapper(occupantManager.remove));
  router.use('/tenants', occupantsRouter);

  // ── Rents ───────────────────────────────────────────────────────────────────
  const rentsRouter = express.Router();
  rentsRouter.patch('/payment/:id/:term', Middlewares.asyncWrapper(rentManager.updateByTerm));
  rentsRouter.get('/tenant/:id', Middlewares.asyncWrapper(rentManager.rentsOfOccupant));
  rentsRouter.get('/tenant/:id/:term', Middlewares.asyncWrapper(rentManager.rentOfOccupantByTerm));
  rentsRouter.get('/:year/:month', Middlewares.asyncWrapper(rentManager.all));
  router.use('/rents', rentsRouter);

  // ── Properties ──────────────────────────────────────────────────────────────
  const propertiesRouter = express.Router();
  propertiesRouter.get('/', Middlewares.asyncWrapper(propertyManager.all));
  propertiesRouter.get('/:id', Middlewares.asyncWrapper(propertyManager.one));
  propertiesRouter.post('/', Middlewares.asyncWrapper(propertyManager.add));
  propertiesRouter.patch('/:id', Middlewares.asyncWrapper(propertyManager.update));
  propertiesRouter.delete('/:ids', Middlewares.asyncWrapper(propertyManager.remove));
  router.use('/properties', propertiesRouter);

  // ── Accounting ──────────────────────────────────────────────────────────────
  router.get('/accounting/:year', Middlewares.asyncWrapper(accountingManager.all));
  router.get('/csv/tenants/incoming/:year', Middlewares.asyncWrapper(accountingManager.csv.incomingTenants));
  router.get('/csv/tenants/outgoing/:year', Middlewares.asyncWrapper(accountingManager.csv.outgoingTenants));
  router.get('/csv/settlements/:year', Middlewares.asyncWrapper(accountingManager.csv.settlements));

  // ── Emails ──────────────────────────────────────────────────────────────────
  const emailRouter = express.Router();
  emailRouter.post('/', Middlewares.asyncWrapper(emailManager.send));
  router.use('/emails', emailRouter);

  // ── Owners (proprietários) ──────────────────────────────────────────────────
  const ownersRouter = express.Router();
  ownersRouter.get('/', Middlewares.asyncWrapper(ownerManager.all));
  ownersRouter.post('/', Middlewares.asyncWrapper(ownerManager.add));
  ownersRouter.get('/:id', Middlewares.asyncWrapper(ownerManager.one));
  ownersRouter.put('/:id', Middlewares.asyncWrapper(ownerManager.update));
  ownersRouter.delete('/:id', Middlewares.asyncWrapper(ownerManager.remove));
  ownersRouter.get('/:id/properties', Middlewares.asyncWrapper(ownerManager.properties));
  router.use('/owners', ownersRouter);

  // ── Guarantees (garantias) ──────────────────────────────────────────────────
  const guaranteesRouter = express.Router();
  guaranteesRouter.get('/:leaseId', Middlewares.asyncWrapper(guaranteeManager.one));
  guaranteesRouter.post('/:leaseId', Middlewares.asyncWrapper(guaranteeManager.add));
  guaranteesRouter.put('/:leaseId', Middlewares.asyncWrapper(guaranteeManager.update));
  router.use('/guarantees', guaranteesRouter);

  // ── MonthlyCharges (cobranças) ──────────────────────────────────────────────
  const chargesRouter = express.Router();
  chargesRouter.get('/', Middlewares.asyncWrapper(monthlyBillingManager.all));
  chargesRouter.post('/generate', Middlewares.asyncWrapper(monthlyBillingManager.generateMonthlyCharges));
  chargesRouter.get('/:id', Middlewares.asyncWrapper(monthlyBillingManager.one));
  chargesRouter.put('/:id', Middlewares.asyncWrapper(monthlyBillingManager.update));
  chargesRouter.post('/:id/items', Middlewares.asyncWrapper(monthlyBillingManager.addItem));
  chargesRouter.post('/:id/pay', Middlewares.asyncWrapper(monthlyBillingManager.registerPayment));
  chargesRouter.post('/:id/boleto', Middlewares.asyncWrapper(boletoManager.emitBoleto));
  router.use('/charges', chargesRouter);

  // ── Adjustments (reajustes) ─────────────────────────────────────────────────
  const adjustmentsRouter = express.Router();
  adjustmentsRouter.get('/pending', Middlewares.asyncWrapper(indexAdjustmentManager.pendingAdjustments));
  adjustmentsRouter.get('/indexes', Middlewares.asyncWrapper(indexAdjustmentManager.getIndexRates));
  adjustmentsRouter.post('/:id/apply', Middlewares.asyncWrapper(indexAdjustmentManager.applyAdjustment));
  router.use('/adjustments', adjustmentsRouter);

  const apiRouter = express.Router();
  apiRouter.use('/api/v2', router);

  // ── Webhooks (fora do auth middleware) ──────────────────────────────────────
  apiRouter.post('/api/webhooks/cora', express.json(), boletoManager.handleCoraWebhook);

  return apiRouter;
}
