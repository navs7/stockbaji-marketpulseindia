// All dates are handled as real instants; display and day-math use IST (UTC+5:30, no DST).
const IST_OFFSET = 330 * 60000;
export const DAY = 86400000;

// Sample exchange holiday list (illustrative; replace with the official NSE/BSE circular).
export const HOLIDAYS = ['2026-12-25', '2027-01-26', '2027-03-04', '2027-04-02'];

// Shift an instant so its UTC fields equal IST wall-clock fields.
const toIst = (d) => new Date(new Date(d).getTime() + IST_OFFSET);
export const istParts = (d) => {
  const x = toIst(d);
  return { y: x.getUTCFullYear(), m: x.getUTCMonth(), d: x.getUTCDate(), h: x.getUTCHours(), min: x.getUTCMinutes(), dow: x.getUTCDay() };
};
export const ymd = (d) => {
  const p = istParts(d);
  return `${p.y}-${String(p.m + 1).padStart(2, '0')}-${String(p.d).padStart(2, '0')}`;
};
// Build an instant from IST wall-clock fields.
export const atIst = (y, m, d, h = 0, min = 0) => new Date(Date.UTC(y, m, d, h, min) - IST_OFFSET);
export const parseYmd = (s, h = 0, min = 0) => {
  const [y, m, d] = s.split('-').map(Number);
  return atIst(y, m - 1, d, h, min);
};
export const startOfDay = (d) => { const p = istParts(d); return atIst(p.y, p.m, p.d); };
export const addDays = (d, n) => new Date(new Date(d).getTime() + n * DAY);
export const withTime = (d, h, min = 0) => { const p = istParts(d); return atIst(p.y, p.m, p.d, h, min); };
export const sameDay = (a, b) => ymd(a) === ymd(b);

export const isTradingDay = (d) => {
  const { dow } = istParts(d);
  return dow !== 0 && dow !== 6 && !HOLIDAYS.includes(ymd(d));
};
export const prevTradingDay = (d, n = 1) => {
  let x = new Date(d);
  while (n > 0) { x = addDays(x, -1); if (isTradingDay(x)) n--; }
  return x;
};
export const nextTradingDay = (d, n = 1) => {
  let x = new Date(d);
  while (n > 0) { x = addDays(x, 1); if (isTradingDay(x)) n--; }
  return x;
};

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const DOW_SHORT = DOW;

// "Wed, 4 Nov 2026"
export const fmtDate = (d) => { const p = istParts(d); return `${DOW[p.dow]}, ${p.d} ${MON[p.m]} ${p.y}`; };
export const fmtDay = (d) => { const p = istParts(d); return `${p.d} ${MON[p.m]}`; };
export const fmtTime = (d) => {
  const p = istParts(d);
  const h12 = p.h % 12 || 12;
  return `${h12}:${String(p.min).padStart(2, '0')} ${p.h < 12 ? 'AM' : 'PM'} IST`;
};
export const fmtDateTime = (d) => `${fmtDate(d)} · ${fmtTime(d)}`;

export const relDay = (d, now = new Date()) => {
  const diff = Math.round((startOfDay(d) - startOfDay(now)) / DAY);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  if (diff > 1 && diff < 7) return `In ${diff} days`;
  if (diff < -1 && diff > -7) return `${-diff} days ago`;
  return fmtDay(d);
};

export const ago = (d, now = new Date()) => {
  const m = Math.round((now - new Date(d)) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  return `${Math.round(h / 24)} d ago`;
};

// Indian digit grouping: 1,25,000
export const inr = (n, dp = 0) => {
  if (n == null || Number.isNaN(n)) return '—';
  return '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: dp, maximumFractionDigits: dp });
};
export const num = (n, dp = 0) => Number(n).toLocaleString('en-IN', { minimumFractionDigits: dp, maximumFractionDigits: dp });

// datetime-local helpers (IST wall-clock)
export const toLocalInput = (d) => { const p = istParts(d); const z = (n) => String(n).padStart(2, '0'); return `${p.y}-${z(p.m + 1)}-${z(p.d)}T${z(p.h)}:${z(p.min)}`; };
export const fromLocalInput = (s) => { const [dt, tm] = s.split('T'); const [h, m] = (tm || '09:00').split(':').map(Number); return parseYmd(dt, h, m); };
