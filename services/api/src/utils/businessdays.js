// Calcula a Páscoa pelo algoritmo de Butcher (retorna { month: 1-12, day })
function _easter(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { month, day };
}

function _addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function _toKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// Retorna Set de strings 'YYYY-MM-DD' com feriados nacionais do ano
function _nationalHolidays(year) {
  const pad = (n) => String(n).padStart(2, '0');
  const fixed = [
    `${year}-01-01`, // Confraternização Universal
    `${year}-04-21`, // Tiradentes
    `${year}-05-01`, // Dia do Trabalho
    `${year}-09-07`, // Independência
    `${year}-10-12`, // N.S. Aparecida
    `${year}-11-02`, // Finados
    `${year}-11-15`, // Proclamação da República
    `${year}-11-20`, // Consciência Negra (lei 14.759/2023)
    `${year}-12-25`  // Natal
  ];

  const { month, day } = _easter(year);
  const easter = new Date(year, month - 1, day);

  const variable = [
    _toKey(_addDays(easter, -2)), // Sexta-feira Santa
    _toKey(_addDays(easter, 60))  // Corpus Christi
  ];

  return new Set([...fixed, ...variable]);
}

function _isBusinessDay(date, holidays) {
  const dow = date.getDay(); // 0 = dom, 6 = sab
  return dow !== 0 && dow !== 6 && !holidays.has(_toKey(date));
}

/**
 * Retorna a data do N-ésimo dia útil de um mês/ano.
 * @param {number} year
 * @param {number} month  1-12
 * @param {number} nth    qual dia útil (ex: 5 = 5º dia útil)
 * @returns {Date}
 */
export function nthBusinessDayOfMonth(year, month, nth) {
  const holidays = _nationalHolidays(year);
  let count = 0;
  const daysInMonth = new Date(year, month, 0).getDate();

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    if (_isBusinessDay(date, holidays)) {
      count++;
      if (count === nth) return date;
    }
  }

  // Se nth > dias úteis do mês, retorna o último dia útil encontrado
  for (let day = daysInMonth; day >= 1; day--) {
    const date = new Date(year, month - 1, day);
    if (_isBusinessDay(date, holidays)) return date;
  }

  return new Date(year, month - 1, daysInMonth);
}

/**
 * Retorna a data de vencimento para um contrato.
 * @param {number} year
 * @param {number} month  1-12
 * @param {number} dueDay dia do vencimento (1-31 ou Nth dia útil)
 * @param {'fixo'|'util'} dueType
 * @returns {Date}
 */
export function calcDueDate(year, month, dueDay, dueType) {
  if (dueType === 'util') {
    return nthBusinessDayOfMonth(year, month, dueDay);
  }
  // dia fixo — clamp ao último dia do mês se dueDay > dias do mês (ex: 31 em fevereiro)
  const daysInMonth = new Date(year, month, 0).getDate();
  const day = Math.min(dueDay, daysInMonth);
  return new Date(year, month - 1, day);
}
