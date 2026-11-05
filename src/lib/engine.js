// Client-side reminder planner + dispatcher rules (PRD section 10). On Blaze, the same rules move to
// Cloud Functions (see /functions). Pure functions: easy to move and to test.
import { CORPORATE_ACTIONS, IPOS, GLOBAL_EVENTS, INSTRUMENTS } from '../data/seed.js';
import { addDays, withTime, prevTradingDay, nextTradingDay, isTradingDay, istParts, atIst, startOfDay, fmtDay, fmtTime, DAY, ymd } from './dates.js';

export const KIND_LABEL = { dividend: 'Dividend', bonus: 'Bonus', split: 'Stock split', rights: 'Rights issue', buyback: 'Buyback', agm: 'AGM', board: 'Board meeting' };
export const instBySym = Object.fromEntries(INSTRUMENTS.map((i) => [i.symbol, i]));

// ---- Subscriptions ----
export const watchedSymbols = (st) => {
  const set = new Set();
  st.watchlists.forEach((w) => w.items.forEach((s) => set.add(s)));
  Object.keys(st.follows.stock).forEach((s) => set.add(s));
  // user can turn off corporate-action alerts per stock
  return [...set].filter((s) => st.follows.stock[s]?.corporate !== false);
};

// ---- Effective event facts (apply admin overrides) ----
export const allActions = (st) => CORPORATE_ACTIONS.map((a) => ({ ...a, ...(st.adminEdits?.[a.id] || {}) })).concat(st.extraActions || []);

// ---- Reminder planner ----
const R = (id, p) => ({ priority: 'Normal', tags: [], kind: 'system', ...p, id });

const actionReminders = (a, lead) => {
  const inst = instBySym[a.symbol];
  const nm = inst?.name || a.symbol;
  const link = `/stocks/${encodeURIComponent(a.symbol)}`;
  const base = { category: a.kind === 'board' ? 'results' : 'corporate', tags: [a.symbol], link, eventId: a.id, eventKind: a.kind };
  const out = [];
  const cancelled = a.status === 'cancelled';
  const T = (s) => (a.status === 'revised' ? `Changed: ${s}` : s);
  out.push(R(`${a.id}:ann`, { ...base, title: T(`${nm}: ${a.kind === 'dividend' ? (a.sub || '') + ' dividend' : KIND_LABEL[a.kind]} announced`).replace('  ', ' '), body: a.purpose, due: a.announced, priority: 'Low' }));
  if (a.kind === 'dividend' || a.kind === 'bonus' || a.kind === 'split') {
    const lastBuy = prevTradingDay(a.ex, 1);
    const alert = prevTradingDay(a.ex, lead.exDays);
    const val = a.kind === 'dividend' ? `₹${a.amount} per share` : a.kind === 'bonus' ? `ratio ${a.ratio}` : a.ratio;
    out.push(R(`${a.id}:pre`, { ...base, title: `${nm} ${KIND_LABEL[a.kind].toLowerCase()}: last day to buy is ${fmtDay(lastBuy)}`, body: `Ex-date ${fmtDay(a.ex)}, record date ${fmtDay(a.record)}. ${val}. Buy by the last day to be eligible (T+1).`, due: withTime(alert, 9), priority: 'High' }));
    out.push(R(`${a.id}:ex`, { ...base, title: `${nm} ex-date today`, body: `Shares trade ex-${a.kind} from today. ${val}.`, due: withTime(a.ex, 8, 30) }));
    if (a.pay) out.push(R(`${a.id}:pay`, { ...base, title: `${nm} ${a.kind} credit expected today`, body: 'Payment or credit date as announced. Check your bank or demat account.', due: withTime(a.pay, 9), priority: 'Low' }));
  }
  if (a.kind === 'rights' || a.kind === 'buyback') {
    out.push(R(`${a.id}:rec`, { ...base, title: `${nm} ${KIND_LABEL[a.kind].toLowerCase()}: record date today`, body: `Entitlement is decided on the record date. ${a.ratio ? 'Ratio ' + a.ratio + '. ' : ''}${a.price ? 'Price ₹' + a.price + '.' : ''}`, due: withTime(a.record, 8, 30), priority: 'High' }));
    out.push(R(`${a.id}:open`, { ...base, title: `${nm} ${KIND_LABEL[a.kind].toLowerCase()} opens today`, body: `Open ${fmtDay(a.open)} to ${fmtDay(a.close)}.`, due: withTime(a.open, 9) }));
    out.push(R(`${a.id}:c2`, { ...base, title: `${nm} ${KIND_LABEL[a.kind].toLowerCase()} closes in 2 days`, body: `Closes ${fmtDay(a.close)}.`, due: withTime(prevTradingDay(a.close, 2), 9), priority: 'High' }));
    if (a.kind === 'rights') out.push(R(`${a.id}:c0`, { ...base, title: `${nm} rights issue closes today`, body: 'Last day to subscribe.', due: withTime(a.close, 9), priority: 'High' }));
  }
  if (a.kind === 'board') {
    out.push(R(`${a.id}:day`, { ...base, title: `${nm} board meeting today`, body: a.purpose, due: withTime(a.meeting, 8, 30) }));
    out.push(R(`${a.id}:out`, { ...base, title: `${nm}: board meeting outcome expected`, body: 'Outcome is filed with the exchanges after the meeting.', due: new Date(a.meeting.getTime() + 4 * 3600000), priority: 'Low' }));
  }
  if (a.kind === 'agm') {
    out.push(R(`${a.id}:7`, { ...base, title: `${nm} AGM in 7 days`, body: `E-voting opens ${fmtDay(a.evoteOpen)}.`, due: withTime(addDays(a.meeting, -7), 9) }));
    out.push(R(`${a.id}:1`, { ...base, title: `${nm} AGM tomorrow`, body: a.purpose, due: withTime(addDays(a.meeting, -1), 9) }));
  }
  if (cancelled) return out.map((r) => ({ ...r, cancelled: true, title: 'Cancelled: ' + r.title }));
  return out;
};

const ipoReminders = (p, st) => {
  const on = st.iposRemind[p.slug] || st.prefs.iposAuto === 'all' || (st.prefs.iposAuto === 'mainboard' && p.type === 'Mainboard') || (st.prefs.iposAuto === 'sme' && p.type === 'SME');
  if (!on) return [];
  const applied = !!st.applied[p.slug];
  const base = { category: 'ipo', tags: [p.slug], link: `/ipos/${p.slug}`, eventId: p.slug, eventKind: 'ipo' };
  const out = [
    R(`${p.slug}:open`, { ...base, title: `${p.name} IPO opens today`, body: `Price band ₹${p.band[0]}–${p.band[1]}, lot ${p.lot}. Closes ${fmtDay(p.close)}.`, due: withTime(p.open, 9) }),
    R(`${p.slug}:close`, { ...base, title: `${p.name} IPO closes today · UPI cut-off ${p.upi} IST`, body: 'Last day to bid. Approve UPI mandate before the cut-off.', due: withTime(p.close, 9), priority: 'High' }),
  ];
  const late = [
    R(`${p.slug}:allot`, { ...base, title: `${p.name} allotment finalised`, body: `Check status on the registrar (${p.registrar}) website.`, due: withTime(p.allot, 20) }),
    R(`${p.slug}:refund`, { ...base, title: `${p.name}: refund / UPI unblock today`, body: 'Unallotted funds are unblocked or refunded.', due: withTime(p.refund, 9), priority: 'Low' }),
    R(`${p.slug}:list`, { ...base, title: `${p.name} lists today on ${p.exchange}`, body: 'Listing day. Pre-open session starts 9:00 AM.', due: withTime(p.listing, 8, 30), priority: 'High' }),
  ];
  // "Applied" toggle: if the user marked any IPO as applied, late-stage reminders only go to applied IPOs (FR-4.6)
  const gated = Object.keys(st.applied).some((k) => st.applied[k]);
  return out.concat(gated && !applied ? [] : late);
};

const globalReminders = (g, st) => {
  const f = st.follows;
  const hit = g.factors.some((x) => f.factor[x]) || g.industries.some((x) => f.industry[x]) || watchedSymbols(st).some((s) => g.industries.includes(instBySym[s]?.industry));
  if (!hit) return [];
  const base = { category: 'global', tags: [...g.factors, ...g.industries.slice(0, 2)], link: '/global', eventId: g.id, eventKind: 'global' };
  if (!g.scheduled) return [R(`${g.id}:new`, { ...base, title: g.name, body: g.why, due: g.created, priority: g.importance === 3 ? 'High' : 'Normal' })];
  const ind = g.country === 'India' ? 'indiamacro' : 'global';
  return [
    R(`${g.id}:1d`, { ...base, category: ind, title: `Tomorrow: ${g.name}`, body: g.why, due: addDays(g.at, -1), priority: 'Low' }),
    R(`${g.id}:30m`, { ...base, category: ind, title: `In 30 min: ${g.name}`, body: `Previous ${g.prev}${g.cons && g.cons !== 'n/a' ? ', consensus ' + g.cons : ''}.`, due: new Date(g.at.getTime() - 30 * 60000), priority: g.importance === 3 ? 'High' : 'Normal' }),
  ];
};

// Custom reminder expansion (repeat rules, FR-8.3/8.4). Returns instances inside [from, to].
export const expandCustom = (c, from, to) => {
  const out = [];
  const first = new Date(c.due);
  const end = c.endDate ? new Date(c.endDate) : to;
  const lim = end < to ? end : to;
  const push = (d) => { if (d >= from && d <= lim) out.push(d); };
  if (!c.repeat || c.repeat === 'none') { if (first >= from && first <= to) out.push(first); return out; }
  const p0 = istParts(first);
  for (let i = 0; i < 400; i++) {
    let d;
    if (c.repeat === 'daily') d = addDays(first, i);
    else if (c.repeat === 'trading') { d = addDays(first, i); if (!isTradingDay(d)) continue; }
    else if (c.repeat === 'weekly') d = addDays(first, 7 * i);
    else if (c.repeat === 'monthly') d = atIst(p0.y, p0.m + i, p0.d, p0.h, p0.min);
    else if (c.repeat === 'quarterly') d = atIst(p0.y, p0.m + 3 * i, p0.d, p0.h, p0.min);
    else d = addDays(first, i);
    if (d > lim) break;
    push(d);
  }
  return out;
};

export const planReminders = (st, now = new Date()) => {
  const lead = { exDays: st.prefs.exLead ?? 2 };
  const watched = new Set(watchedSymbols(st));
  const sectors = new Set(Object.keys(st.follows.industry).filter((k) => st.follows.industry[k]));
  const out = [];
  allActions(st).forEach((a) => {
    if (watched.has(a.symbol)) out.push(...actionReminders(a, lead));
    else if (sectors.has(instBySym[a.symbol]?.industry) && st.follows.industry[instBySym[a.symbol].industry]?.corporate) out.push(...actionReminders(a, lead));
  });
  IPOS.forEach((p) => out.push(...ipoReminders(p, st)));
  GLOBAL_EVENTS.forEach((g) => out.push(...globalReminders(g, st)));
  const from = addDays(now, -2), to = addDays(now, 120);
  (st.custom || []).forEach((c) => {
    expandCustom(c, from, to).forEach((d) => out.push({ id: `cu:${c.id}:${ymd(d)}`, kind: 'custom', customId: c.id, title: c.title, body: c.note || '', category: c.category || 'personal', priority: c.priority || 'Normal', due: d, tags: c.tags || [], link: c.link || null, repeat: c.repeat }));
  });
  return out;
};

// ---- Quiet hours + overrides ----
const minutesOfDay = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
export const inQuiet = (d, q) => {
  if (!q?.on) return false;
  const p = istParts(d); const m = p.h * 60 + p.min; const s = minutesOfDay(q.start), e = minutesOfDay(q.end);
  return s > e ? m >= s || m < e : m >= s && m < e;
};
export const quietEnd = (d, q) => {
  const p = istParts(d); const e = minutesOfDay(q.end); const [h, m] = [Math.floor(e / 60), e % 60];
  let end = atIst(p.y, p.m, p.d, h, m);
  if (end <= d) end = addDays(end, 1);
  return end;
};

// Resolve a reminder with its user state into its effective view.
export const resolve = (r, st, now = new Date()) => {
  const o = st.rem[r.id] || {};
  const ruleCat = (st.rules || []).find((x) => r.tags.includes(x.tag))?.category;
  const cat = o.category || ruleCat || r.category;
  const priority = o.priority || r.priority;
  const cs = st.catSettings[cat] || {};
  let due = o.due ? new Date(o.due) : r.due;
  if (o.snoozeUntil) due = new Date(o.snoozeUntil);
  const bypass = priority === 'High' && st.prefs.highBypassQuiet;
  const quietShift = inQuiet(due, st.prefs.quiet) && !(bypass || cs.quietBypass);
  const eff = quietShift ? quietEnd(due, st.prefs.quiet) : due;
  let status = o.status || 'scheduled';
  if (r.cancelled) status = 'cancelled';
  if (status === 'scheduled' || status === 'snoozed') {
    if (o.snoozeUntil && new Date(o.snoozeUntil) > now) status = 'snoozed';
    else if (eff <= now) status = 'delivered';
    else status = 'scheduled';
  }
  return { ...r, category: cat, priority, orig: r.due, due: eff, status, snoozes: o.snoozes || [], doneAt: o.doneAt, muted: !!cs.mute, digest: !!cs.digest };
};

export const buildInbox = (st, now = new Date()) =>
  planReminders(st, now)
    .map((r) => resolve(r, st, now))
    .filter((r) => !(r.status === 'delivered' && r.due < addDays(now, -2) && !st.rem[r.id]) ) // auto-expire stale untouched items
    .sort((a, b) => a.due - b.due);

// ---- Snooze presets with guard rails (FR-9.1/9.3) ----
export const relevanceDeadline = (r) => {
  if (r.eventKind === 'ipo') {
    const p = IPOS.find((x) => x.slug === r.eventId);
    if (p && /:(open|close)$/.test(r.id)) return withTime(p.close, 17);
  }
  if (r.eventKind && /:pre$/.test(r.id)) {
    const a = CORPORATE_ACTIONS.find((x) => x.id === r.eventId);
    if (a?.ex) return withTime(prevTradingDay(a.ex, 1), 15, 30);
  }
  return null;
};

export const snoozePresets = (now = new Date()) => {
  const tmr = withTime(addDays(now, 1), 9);
  let preOpen = withTime(nextTradingDay(now, 1), 9);
  if (isTradingDay(now) && istParts(now).h < 9) preOpen = withTime(now, 9);
  const nt3 = withTime(nextTradingDay(now, 1), 15);
  return [
    { key: '15m', label: '15 minutes', at: new Date(now.getTime() + 15 * 60000) },
    { key: '1h', label: '1 hour', at: new Date(now.getTime() + 3600000) },
    { key: '3h', label: '3 hours', at: new Date(now.getTime() + 3 * 3600000) },
    { key: 'tmr', label: 'Tomorrow 9:00 AM', at: tmr },
    { key: 'open', label: 'Before market open (9:00 AM)', at: preOpen },
    { key: 'nt', label: 'Next trading day 3:00 PM', at: nt3 },
  ];
};

export const clampSnooze = (at, r) => {
  const dl = relevanceDeadline(r);
  if (dl && at > dl) return { at: new Date(dl.getTime() - 30 * 60000), clamped: true, deadline: dl };
  return { at, clamped: false };
};

export const categoryMeta = (key, st, cats) => {
  const base = cats.find((c) => c.key === key);
  const custom = (st.customCategories || []).find((c) => c.key === key);
  const s = st.catSettings[key] || {};
  const m = base || custom || { key, label: key, color: '#5B6470', icon: 'tag' };
  return { ...m, label: s.label || m.label, color: s.color || m.color };
};
