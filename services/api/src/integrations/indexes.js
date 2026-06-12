import axios from 'axios';

const _cache = new Map();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

async function _cached(key, fetchFn) {
  const hit = _cache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.value;

  const value = await fetchFn();
  _cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
  return value;
}

async function _fetchIPCA(period) {
  // IBGE SIDRA API — série 1737 (IPCA variação mensal)
  const [year, month] = period.split('-');
  const url = `https://servicodados.ibge.gov.br/api/v3/agregados/1737/periodos/${year}${month}/variaveis/63?localidades=N1[all]`;
  const resp = await axios.get(url, { timeout: 10000 });
  const val = resp.data?.[0]?.resultados?.[0]?.series?.[0]?.serie?.[`${year}${month}`];
  if (val === undefined || val === null) throw new Error('IPCA data not available');
  return parseFloat(val);
}

async function _fetchIGPM(period) {
  // FGV via IBGE SIDRA — série 28655 (IGP-M variação mensal)
  const [year, month] = period.split('-');
  const url = `https://servicodados.ibge.gov.br/api/v3/agregados/28655/periodos/${year}${month}/variaveis/9804?localidades=N1[all]`;
  const resp = await axios.get(url, { timeout: 10000 });
  const val = resp.data?.[0]?.resultados?.[0]?.series?.[0]?.serie?.[`${year}${month}`];
  if (val === undefined || val === null) throw new Error('IGPM data not available');
  return parseFloat(val);
}

async function _fetchINCC(period) {
  const [year, month] = period.split('-');
  const url = `https://servicodados.ibge.gov.br/api/v3/agregados/2296/periodos/${year}${month}/variaveis/188?localidades=N1[all]`;
  const resp = await axios.get(url, { timeout: 10000 });
  const val = resp.data?.[0]?.resultados?.[0]?.series?.[0]?.serie?.[`${year}${month}`];
  if (val === undefined || val === null) throw new Error('INCC data not available');
  return parseFloat(val);
}

export async function getIndex(index, period) {
  const key = `${index}:${period}`;
  switch (index) {
    case 'IPCA':
      return _cached(key, () => _fetchIPCA(period));
    case 'IGPM':
    case 'IGP-DI':
      return _cached(key, () => _fetchIGPM(period));
    case 'INCC':
      return _cached(key, () => _fetchINCC(period));
    default:
      throw new Error(`Index ${index} not supported`);
  }
}
