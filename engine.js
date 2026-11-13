/* Money is allocated in integer piastres. Dates are YYYY-MM or YYYY-MM-DD. */
function monthAfter(month, delta) {
  const [year, number] = String(month || '').slice(0, 7).split('-').map(Number);
  const offset = (number || 1) - 1 + delta;
  return (year + Math.floor(offset / 12)) + '-' + String(offset % 12 + 1).padStart(2, '0');
}

const ITEM_META = {
  garage: { ar: 'الجراج', en: 'Garage' },
  storage: { ar: 'المخزن', en: 'Storage room' },
  utilities: { ar: 'المرافق', en: 'Utilities' },
  maintenance: { ar: 'وديعة الصيانة', en: 'Maintenance deposit' }
};
const ITEM_KEYS = ['garage', 'storage', 'utilities'];

function emptyItems() {
  return {
    garage: { state: 'unspecified', amount: 0, due: '', day: '' },
    storage: { state: 'unspecified', amount: 0, due: '', day: '' },
    utilities: { state: 'unspecified', amount: 0, due: '', day: '' }
  };
}

function isMonth(value) {
  return /^\d{4}-\d{2}$/.test(String(value || ''));
}
function isDate(value) {
  return /^\d{4}-\d{2}(-\d{2})?$/.test(String(value || ''));
}
function dayPart(value) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 1 && number <= 31 ? number : '';
}
function daysInMonth(month) {
  const [year, number] = String(month || '').slice(0, 7).split('-').map(Number);
  if (!year || !number) return 31;
  return new Date(year, number, 0).getDate();
}
function fullDate(month, day) {
  const value = String(month || '');
  if (!isMonth(value)) return value;
  const number = dayPart(day);
  if (!number) return value;
  return value + '-' + String(Math.min(number, daysInMonth(value))).padStart(2, '0');
}

function normalizeOffer(input) {
  const o = input && typeof input === 'object' ? input : {};

  if (!o.items || typeof o.items !== 'object') o.items = emptyItems();
  for (const key of ITEM_KEYS) {
    const item = o.items[key] && typeof o.items[key] === 'object' ? o.items[key] : {};
    o.items[key] = {
      state: ['unspecified', 'included', 'extra'].includes(item.state) ? item.state : 'unspecified',
      amount: Number.isFinite(+item.amount) ? Math.max(0, +item.amount) : 0,
      due: isMonth(item.due) ? item.due : '',
      day: dayPart(item.day)
    };
  }

  if (!o.legal || typeof o.legal !== 'object') o.legal = {};
  o.legal = {
    noDues: !!o.legal.noDues,
    poa: !!o.legal.poa,
    contract: !!o.legal.contract
  };

  if (o.offerType !== 'cash' && o.offerType !== 'installments') o.offerType = 'installments';
  if (!['extra', 'included', 'unspecified'].includes(o.maintenanceState)) {
    o.maintenanceState = (+o.maintenance || 0) > 0 ? 'extra' : 'unspecified';
  }
  if (!['split', 'handover', 'date', 'none'].includes(o.maintenanceDateMode)) {
    o.maintenanceDateMode = o.split ? 'split' : 'handover';
  }
  o.split = o.maintenanceDateMode === 'split';
  if (!['handover', 'date', 'none'].includes(o.deliveryDateMode)) o.deliveryDateMode = 'handover';

  o.start = isMonth(o.start) ? o.start : (isDate(o.start) ? String(o.start).slice(0, 7) : new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0'));
  o.handover = isMonth(o.handover) ? o.handover : (isDate(o.handover) ? String(o.handover).slice(0, 7) : monthAfter(o.start, 36));
  o.deliveryDate = isMonth(o.deliveryDate) ? o.deliveryDate : '';
  o.maintenanceDate = isMonth(o.maintenanceDate) ? o.maintenanceDate : '';
  o.startDay = dayPart(o.startDay);
  o.handoverDay = dayPart(o.handoverDay);
  o.deliveryDay = dayPart(o.deliveryDay);
  o.maintenanceDay = dayPart(o.maintenanceDay);

  if (typeof o.showTotal !== 'boolean') o.showTotal = true;
  if (!Array.isArray(o.hidden)) o.hidden = [];
  if (!o.edits || typeof o.edits !== 'object') o.edits = {};
  if (!o.types || typeof o.types !== 'object') o.types = {};

  if (!Array.isArray(o.customRows)) o.customRows = [];
  o.customRows = o.customRows.filter(row => row && row.id && isDate(row.date)).map(row => ({
    id: String(row.id),
    date: String(row.date),
    type: row.type === 'payment' ? 'payment' : 'installment',
    value: Number.isFinite(+row.value) ? Math.max(0, +row.value) : 0
  }));

  if (!Array.isArray(o.allocations)) o.allocations = [];
  o.allocations = o.allocations.filter(item => item && Number.isFinite(+item.amount) && +item.amount >= 0).map(item => ({
    year: Math.round(+item.year) || 0,
    month: Math.round(+item.month) || 0,
    amount: Math.max(0, +item.amount)
  })).filter(item => item.year >= 2000 && item.year <= 2200 && (!item.month || (item.month >= 1 && item.month <= 12)));

  return o;
}

function itemAmountCents(item) {
  const amount = Number(item && item.amount);
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return wholePounds(amount * 100);
}
function wholePounds(cents) {
  const value = Number(cents);
  if (!Number.isFinite(value)) return 0;
  return Math.round(value / 100) * 100;
}
function inputPounds(value) {
  return Math.round(+value || 0) * 100;
}

function schedule(input) {
  const p = normalizeOffer(input);
  const price = Math.round(+p.price || 0) * 100;
  const atRate = rate => wholePounds(price * (+rate || 0) / 100);
  const cash = p.offerType === 'cash';
  const down = cash ? 0 : (p.mode === 'amount' ? inputPounds(p.down) : atRate(p.down));
  const delivery = cash ? 0 : atRate(p.delivery);
  const maintenanceExtra = p.maintenanceState === 'extra' ? atRate(p.maintenance) : 0;
  const commission = p.feeMode === 'amount' ? inputPounds(p.fee) : atRate(p.fee);
  const financed = cash ? 0 : price - down - delivery;
  const planCount = cash ? 0 : Math.ceil((+p.years || 0) * 12 / (+p.period || 1));
  const startDate = fullDate(p.start, p.startDay);
  const handoverDate = fullDate(p.handover, p.handoverDay);
  const deliveryDate = !cash && p.deliveryDateMode === 'date' && p.deliveryDate
    ? fullDate(p.deliveryDate, p.deliveryDay)
    : handoverDate;
  const maintenanceDate = p.maintenanceDateMode === 'date' && p.maintenanceDate
    ? fullDate(p.maintenanceDate, p.maintenanceDay)
    : handoverDate;
  const maintenanceSplit = !cash && p.maintenanceDateMode === 'split';
  const customPrincipal = cash ? 0 : p.customRows.reduce((sum, row) => sum + (row.value > 0 ? inputPounds(row.value) : 0), 0);
  const installmentBudget = cash ? 0 : financed - customPrincipal;
  let overAllocated = !cash && installmentBudget < 0;
  const valid = price > 0 && Number.isFinite(financed) && (cash || (financed >= 0 && planCount > 0 && handoverDate >= startDate && installmentBudget >= 0));

  const rows = [];
  const add = (id, date, type, value, meta) => {
    const row = Object.assign({ id, date, type, value }, meta || {});
    rows.push(row);
    return row;
  };
  const part = (sum, index, total) => {
    const pounds = Math.round(sum / 100);
    if (total <= 0) return 0;
    const base = Math.ceil(pounds / total);
    const last = pounds - base * (total - 1);
    if (last < 0) {
      const floor = Math.floor(pounds / total);
      const remainder = pounds - floor * total;
      return (index <= remainder ? floor + 1 : floor) * 100;
    }
    return (index < total ? base : last) * 100;
  };

  if (valid || (!cash && installmentBudget < 0)) {
    if (!cash) {
      if (down) add('down', startDate, 'down', down);
      if (delivery) add('delivery', deliveryDate, 'delivery', delivery);
      if (maintenanceExtra && !maintenanceSplit) add('maintenance', maintenanceDate, 'maintenance', maintenanceExtra);
      if (commission && p.payer === 'buyer') add('fee', startDate, 'fee', commission);
      for (let i = 1; i <= planCount; i++) {
        const date = fullDate(monthAfter(p.start, Math.min(i * (+p.period || 1), (+p.years || 0) * 12)), p.startDay);
        if (installmentBudget > 0) add('i' + i, date, 'installment', part(installmentBudget, i, planCount), { generated: true });
        const splitCount = Math.min(planCount, Math.ceil(12 / (+p.period || 1)) * 2);
        if (maintenanceExtra && maintenanceSplit && i <= splitCount) add('m' + i, date, 'maintenance', part(maintenanceExtra, i, splitCount), { maintenanceSplit: true });
      }
    } else if (commission && p.payer === 'buyer') {
      add('fee', startDate, 'fee', commission);
    }
    if (cash && maintenanceExtra) add('maintenance', maintenanceDate, 'maintenance', maintenanceExtra);

    for (const key of ITEM_KEYS) {
      const item = p.items[key];
      if (!item || item.state !== 'extra') continue;
      const value = itemAmountCents(item);
      if (!value) continue;
      const date = item.due ? fullDate(item.due, item.day) : handoverDate;
      add(key, date, key, value, { extra: true, label: key });
    }
  }

  for (const row of rows) {
    if (p.types && p.types[row.id] === 'payment' && row.type === 'installment') row.type = 'payment';
  }

  if ((valid || installmentBudget < 0) && p.customRows.length) {
    for (const custom of p.customRows) {
      const value = inputPounds(custom.value);
      rows.push({ id: custom.id, date: custom.date, type: custom.type === 'payment' ? 'payment' : 'installment', value, custom: true });
    }
  }

  /* Date edits are applied before allocation matching so a moved installment
     follows its new month/year. */
  for (const row of rows) {
    const edit = p.edits && p.edits[row.id];
    if (edit && isDate(edit.date)) row.date = edit.date;
  }

  const generated = rows.filter(row => row.generated);
  const fixed = new Map();
  const sortedAllocations = [...p.allocations].sort((a, b) => (a.month ? 1 : 0) - (b.month ? 1 : 0));
  for (const allocation of sortedAllocations) {
    const cents = inputPounds(allocation.amount);
    for (const row of generated) {
      const [year, month] = row.date.slice(0, 7).split('-').map(Number);
      if (year !== allocation.year) continue;
      if (allocation.month && month !== allocation.month) continue;
      fixed.set(row.id, cents);
    }
  }

  /* Explicit amount edits on generated installments are fixed values; the rest
     of the installment principal is redistributed across the remaining rows. */
  for (const row of rows) {
    const edit = p.edits && p.edits[row.id];
    if (!edit) continue;
    if (Number.isFinite(+edit.value) && +edit.value > 0) {
      if (row.generated) fixed.set(row.id, wholePounds(+edit.value));
      else row.value = wholePounds(+edit.value);
    }
  }

  if (!cash && generated.length) {
    const fixedSum = [...fixed.entries()].reduce((sum, [id, value]) => {
      const row = generated.find(item => item.id === id);
      return sum + (row ? value : 0);
    }, 0);
    const freeRows = generated.filter(row => !fixed.has(row.id));
    const remaining = installmentBudget - fixedSum;
    if (remaining < 0) {
      overAllocated = true;
      for (const row of freeRows) row.value = 0;
    } else if (freeRows.length) {
      freeRows.forEach((row, index) => {
        row.value = part(remaining, index + 1, freeRows.length);
      });
    } else if (remaining !== 0) {
      overAllocated = true;
    }
    for (const row of generated) {
      if (fixed.has(row.id)) row.value = fixed.get(row.id);
    }
  }

  const active = rows.filter(row => !p.hidden.includes(row.id)).sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    const order = { down: 0, fee: 1, delivery: 2, payment: 3, installment: 4 };
    return (order[a.type] ?? 6) - (order[b.type] ?? 6);
  });

  let balance = price;
  let installmentNumber = 0;
  const principalTypes = ['down', 'delivery', 'installment', 'payment'];
  for (const row of active) {
    if (principalTypes.includes(row.type)) balance -= row.value;
    row.balance = balance;
    if (row.type === 'installment' && row.value > 0) row.number = ++installmentNumber;
  }

  const extras = [];
  if (maintenanceExtra) extras.push({
    key: 'maintenance',
    label: 'maintenance',
    amount: maintenanceExtra,
    due: maintenanceSplit ? 'split' : maintenanceDate,
    dueMode: p.maintenanceDateMode
  });
  for (const key of ITEM_KEYS) {
    const item = p.items[key];
    if (!item || item.state !== 'extra') continue;
    const amount = itemAmountCents(item);
    if (amount) extras.push({ key, label: key, amount, due: item.due ? fullDate(item.due, item.day) : handoverDate, dueMode: item.due ? 'date' : 'handover' });
  }

  const includes = [];
  if (p.maintenanceState === 'included') includes.push('maintenance');
  for (const key of ITEM_KEYS) if (p.items[key].state === 'included') includes.push(key);

  const extrasTotal = extras.reduce((sum, item) => sum + item.amount, 0);
  const total = price + extrasTotal + (p.payer === 'buyer' ? commission : 0);
  const activeTotal = active.reduce((sum, row) => sum + row.value, 0);
  const gap = valid && !cash ? Math.max(0, total - activeTotal) : 0;
  const paid = active.reduce((sum, row) => sum + (principalTypes.includes(row.type) ? row.value : 0), 0);
  const remainingUnit = Math.max(0, price - paid);
  const count = active.filter(row => row.type === 'installment' && row.value > 0).length;

  return {
    valid: valid && !overAllocated,
    cash, price, down, delivery,
    maintenance: maintenanceExtra,
    maintenanceState: p.maintenanceState,
    maintenanceDueMode: p.maintenanceDateMode,
    maintenanceDate,
    deliveryDate,
    commission, financed, count, planCount, rows: active, total, gap,
    extras, includes, extrasTotal, remainingUnit,
    customPrincipal, installmentBudget, overAllocated,
    downPct: price ? down / price * 100 : 0,
    deliveryPct: price ? delivery / price * 100 : 0,
    maintenancePct: price ? maintenanceExtra / price * 100 : 0,
    commissionPct: price ? commission / price * 100 : 0
  };
}
