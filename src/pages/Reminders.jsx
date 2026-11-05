import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../store.jsx';
import { Icon, CatChip, PageHead, Tabs, Empty, Drawer, SnoozeMenu, useCat } from '../components/ui.jsx';
import { fmtDate, fmtTime, fmtDateTime, relDay, startOfDay, addDays, toLocalInput, fromLocalInput, ymd } from '../lib/dates.js';
import { CATEGORIES, CORPORATE_ACTIONS, IPOS } from '../data/seed.js';
import { relevanceDeadline } from '../lib/engine.js';

export function ReminderRow({ r, selected, onSelect, selectable, compact }) {
  const { doneRem, dismissRem, reopenRem, now } = useApp();
  const cat = useCat()(r.category);
  const nav = useNavigate();
  const overdue = r.status === 'delivered' && r.due < startOfDay(now);
  const isDone = r.status === 'done' || r.status === 'dismissed';
  return (
    <div className={'rem' + (selected ? ' sel' : '') + (isDone ? ' done' : '')} style={{ '--c': cat.color }}>
      <div className="row" style={{ alignSelf: 'stretch', gap: 10 }}>
        {selectable && <input type="checkbox" className="checkbox" checked={!!selected} onChange={(e) => onSelect(r.id, e.target.checked)} aria-label={`Select ${r.title}`} />}
        <span className="bar" />
      </div>
      <div style={{ minWidth: 0, cursor: 'pointer' }} onClick={() => nav(`/reminders/${encodeURIComponent(r.id)}`)}>
        <div className="t">{r.title}</div>
        {!compact && r.body && <div className="muted" style={{ fontSize: 13.5, marginTop: 2 }}>{r.body}</div>}
        <div className="meta">
          <CatChip k={r.category} />
          <span className="mono">{r.status === 'snoozed' ? 'Snoozed to ' : ''}{fmtTime(r.due)}</span>
          {r.priority !== 'Normal' && <span className={'pri-' + r.priority}>● {r.priority}</span>}
          {overdue && <span className="tag red">Overdue</span>}
          {r.muted && <span className="tag">Muted</span>}
          {r.digest && <span className="tag">Digest</span>}
          {r.repeat && r.repeat !== 'none' && <span className="tag"><Icon n="repeat" s={11} /> {r.repeat}</span>}
          {r.status === 'cancelled' && <span className="tag red">Cancelled</span>}
          {r.snoozes.length > 0 && <span className="tag">Snoozed ×{r.snoozes.length}</span>}
          {r.tags.slice(0, 2).map((t) => <span key={t} className="tag">{t}</span>)}
        </div>
      </div>
      <div className="acts">
        {isDone ? <button className="btn sm" onClick={() => reopenRem(r.id)}>Reopen</button> : (
          <>
            <button className="btn sm" onClick={() => doneRem(r.id)}><Icon n="check" s={14} />Done</button>
            <SnoozeMenu r={r} />
            <button className="btn sm ghost icon-btn" style={{ width: 28, minHeight: 28 }} onClick={() => dismissRem(r.id)} aria-label="Dismiss"><Icon n="x" s={14} /></button>
          </>
        )}
      </div>
    </div>
  );
}

export const DayGroups = ({ list, ...rest }) => {
  const { now } = useApp();
  const groups = useMemo(() => {
    const m = new Map();
    list.forEach((r) => { const k = ymd(r.due); if (!m.has(k)) m.set(k, { d: r.due, items: [] }); m.get(k).items.push(r); });
    return [...m.values()];
  }, [list]);
  return groups.map((g) => (
    <section key={ymd(g.d)}>
      <div className="daygroup">{relDay(g.d, now)} · {fmtDate(g.d)}</div>
      <div className="divide">{g.items.map((r) => <ReminderRow key={r.id} r={r} {...rest} selected={rest.sel?.has(r.id)} />)}</div>
    </section>
  ));
};

export function Reminders() {
  const { inbox, doneRem, dismissRem, snoozeRem, update, now, toast, st } = useApp();
  const [tab, setTab] = useState('today');
  const [catF, setCatF] = useState([]);
  const [sel, setSel] = useState(new Set());
  const [drawer, setDrawer] = useState(false);
  const [bulkCat, setBulkCat] = useState(false);
  const eod = addDays(startOfDay(now), 1);

  const buckets = useMemo(() => {
    const filt = (r) => !catF.length || catF.includes(r.category);
    const b = { today: [], upcoming: [], snoozed: [], done: [] };
    inbox.filter(filt).forEach((r) => {
      if (r.status === 'done' || r.status === 'dismissed' || r.status === 'cancelled') b.done.push(r);
      else if (r.status === 'snoozed') b.snoozed.push(r);
      else if (r.status === 'delivered' || r.due < eod) b.today.push(r);
      else b.upcoming.push(r);
    });
    b.upcoming = b.upcoming.slice(0, 120);
    b.done.sort((a, b2) => b2.due - a.due);
    return b;
  }, [inbox, catF, eod]);

  const list = buckets[tab];
  const toggle = (id, on) => setSel((s) => { const n = new Set(s); on ? n.add(id) : n.delete(id); return n; });
  const ids = [...sel];
  const clear = () => setSel(new Set());
  const catsAll = [...CATEGORIES, ...st.customCategories];

  return (
    <div className="page">
      <PageHead title="Reminders" sub="Everything you can act on, in one inbox. Snooze, mark done or dismiss.">
        <button className="btn primary" onClick={() => setDrawer(true)}><Icon n="plus" />New reminder</button>
      </PageHead>
      <div className="filters" aria-label="Filter by category">
        {catsAll.map((c) => (
          <button key={c.key} className={'fchip' + (catF.includes(c.key) ? ' on' : '')} style={{ '--c': (st.catSettings[c.key]?.color) || c.color }} aria-pressed={catF.includes(c.key)} onClick={() => setCatF(catF.includes(c.key) ? catF.filter((x) => x !== c.key) : [...catF, c.key])}>
            <span className="dot" /><Icon n={c.icon} s={12} />{st.catSettings[c.key]?.label || c.label}
          </button>
        ))}
        {catF.length > 0 && <button className="fchip" onClick={() => setCatF([])}>Clear</button>}
      </div>
      <Tabs value={tab} onChange={(t) => { setTab(t); clear(); }} tabs={[
        { key: 'today', label: 'Today', count: buckets.today.length }, { key: 'upcoming', label: 'Upcoming', count: buckets.upcoming.length },
        { key: 'snoozed', label: 'Snoozed', count: buckets.snoozed.length }, { key: 'done', label: 'Done', count: buckets.done.length },
      ]} />
      {sel.size > 0 && (
        <div className="bulkbar" role="toolbar" aria-label="Bulk actions">
          <b>{sel.size} selected</b><span className="sp" />
          <button className="btn sm" onClick={() => { doneRem(ids); clear(); toast(`${ids.length} marked done`); }}>Done</button>
          <button className="btn sm" onClick={() => { const at = new Date(now.getTime() + 3600000); list.filter((r) => sel.has(r.id)).forEach((r) => snoozeRem(r, at)); clear(); toast('Snoozed 1 hour'); }}>Snooze 1h</button>
          <button className="btn sm" onClick={() => { dismissRem(ids); clear(); }}>Dismiss</button>
          <span style={{ position: 'relative' }}>
            <button className="btn sm" onClick={() => setBulkCat(!bulkCat)}>Category</button>
            {bulkCat && <div className="menu" style={{ color: 'var(--ink)' }}>{catsAll.map((c) => <button key={c.key} onClick={() => { update((s) => { const rem = { ...s.rem }; ids.forEach((i) => (rem[i] = { ...(rem[i] || {}), category: c.key })); return { ...s, rem }; }); setBulkCat(false); clear(); toast('Category changed'); }}>{st.catSettings[c.key]?.label || c.label}</button>)}</div>}
          </span>
          <button className="btn sm ghost" onClick={clear}>Cancel</button>
        </div>
      )}
      <div className="card" style={{ overflow: 'hidden' }}>
        {list.length === 0 ? (
          <Empty title={tab === 'today' ? 'Nothing due today' : tab === 'upcoming' ? 'Nothing coming up' : tab === 'snoozed' ? 'No snoozed reminders' : 'Nothing completed yet'} action={tab !== 'done' && <Link to="/watchlists" className="btn">Follow more stocks</Link>}>
            {tab === 'today' ? 'You’re clear. Follow stocks, sectors or IPOs and reminders will appear here.' : 'Reminders you act on will show here.'}
          </Empty>
        ) : <DayGroups list={list} selectable onSelect={toggle} sel={sel} />}
      </div>
      {drawer && <NewReminder onClose={() => setDrawer(false)} />}
    </div>
  );
}

export function NewReminder({ onClose, seed = {} }) {
  const { update, toast, now, st } = useApp();
  const [f, setF] = useState({ title: '', note: '', due: toLocalInput(new Date(Math.ceil((now.getTime() + 3600000) / 900000) * 900000)), category: 'personal', priority: 'Normal', repeat: 'none', endDate: '', ...seed });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const catsAll = [...CATEGORIES, ...st.customCategories];
  const save = () => {
    const c = { id: Math.random().toString(36).slice(2, 9), title: f.title.trim().slice(0, 120), note: f.note.slice(0, 1000), due: fromLocalInput(f.due).toISOString(), category: f.category, priority: f.priority, repeat: f.repeat, endDate: f.endDate ? fromLocalInput(f.endDate + 'T23:59').toISOString() : null, link: f.link || null, tags: f.tags || [] };
    update((s) => ({ ...s, custom: [...s.custom, c] }));
    toast('Reminder created'); onClose();
  };
  return (
    <Drawer title="New reminder" onClose={onClose} footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn primary" disabled={!f.title.trim()} onClick={save}>Save reminder</button></>}>
      <label className="f">Title<input className="input" maxLength={120} autoFocus value={f.title} onChange={set('title')} placeholder="Review TCS results" /><span className="hint">{f.title.length}/120</span></label>
      <label className="f">Note<textarea className="textarea" maxLength={1000} value={f.note} onChange={set('note')} /><span className="hint">{f.note.length}/1,000</span></label>
      <label className="f">Date and time (IST)<input className="input" type="datetime-local" value={f.due} onChange={set('due')} /></label>
      <div className="grid g2">
        <label className="f">Category<select className="select" value={f.category} onChange={set('category')}>{catsAll.map((c) => <option key={c.key} value={c.key}>{st.catSettings[c.key]?.label || c.label}</option>)}</select></label>
        <label className="f">Priority<select className="select" value={f.priority} onChange={set('priority')}>{['High', 'Normal', 'Low'].map((p) => <option key={p}>{p}</option>)}</select></label>
      </div>
      <div className="grid g2">
        <label className="f">Repeat<select className="select" value={f.repeat} onChange={set('repeat')}>{[['none', 'Does not repeat'], ['daily', 'Daily'], ['trading', 'Every trading day'], ['weekly', 'Weekly'], ['monthly', 'Monthly'], ['quarterly', 'Quarterly']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
        <label className="f">End date<input className="input" type="date" disabled={f.repeat === 'none'} value={f.endDate} onChange={set('endDate')} /></label>
      </div>
      {f.repeat === 'trading' && <p className="faint" style={{ fontSize: 13 }}>Skips weekends and exchange holidays.</p>}
    </Drawer>
  );
}

export function ReminderDetail() {
  const { id } = useParams();
  const rid = decodeURIComponent(id);
  const { inbox, st, update, doneRem, dismissRem, reopenRem, act, now, toast } = useApp();
  const nav = useNavigate();
  const r = inbox.find((x) => x.id === rid);
  const [edit, setEdit] = useState(false);
  const [f, setF] = useState(null);
  if (!r) return <div className="page"><Empty title="Reminder not found" action={<Link className="btn" to="/reminders">Back to reminders</Link>}>It may have expired or been removed.</Empty></div>;

  const ca = CORPORATE_ACTIONS.find((a) => a.id === r.eventId);
  const ipo = IPOS.find((p) => p.slug === r.eventId);
  const dl = relevanceDeadline(r);
  const isCustom = r.kind === 'custom';
  const o = st.rem[r.id] || {};
  const startEdit = () => { setF({ due: toLocalInput(r.orig), priority: r.priority, category: r.category, title: r.title, note: r.body }); setEdit(true); };
  const save = () => {
    if (isCustom) update((s) => ({ ...s, custom: s.custom.map((c) => (c.id === r.customId ? { ...c, title: f.title, note: f.note, priority: f.priority, category: f.category, due: r.repeat && r.repeat !== 'none' ? c.due : fromLocalInput(f.due).toISOString() } : c)) }));
    else act.setRem(r.id, { due: fromLocalInput(f.due).toISOString(), priority: f.priority, category: f.category });
    setEdit(false); toast('Saved');
  };
  const catsAll = [...CATEGORIES, ...st.customCategories];
  return (
    <div className="page" style={{ maxWidth: 820 }}>
      <Link to="/reminders" className="link row" style={{ marginBottom: 14 }}>← Reminders</Link>
      <div className="card pad stack" style={{ gap: 18 }}>
        <div className="row wrap"><CatChip k={r.category} /><span className={'tag ' + (r.status === 'delivered' ? 'accent' : r.status === 'cancelled' ? 'red' : '')}>{r.status}</span>{r.priority !== 'Normal' && <span className={'tag pri-' + r.priority}>{r.priority} priority</span>}</div>
        <h1 style={{ fontSize: 30 }}>{r.title}</h1>
        {r.body && <p style={{ fontSize: 16 }}>{r.body}</p>}
        {r.snoozes.length >= 3 && r.status !== 'done' && (
          <div className="notice"><Icon n="clock" /><span>Snoozed {r.snoozes.length} times. Dismiss or keep? <button className="link" style={{ background: 'none', border: 0, padding: 0, marginLeft: 6 }} onClick={() => dismissRem(r.id)}>Dismiss</button></span></div>
        )}
        <dl className="kv">
          <dt>Due</dt><dd className="mono">{fmtDateTime(r.due)}</dd>
          {String(r.orig) !== String(r.due) && <><dt>Originally</dt><dd className="mono">{fmtDateTime(r.orig)}</dd></>}
          {dl && <><dt>Relevance deadline</dt><dd className="mono">{fmtDateTime(dl)} (snooze can’t go past this)</dd></>}
          {ca && <>
            <dt>Event</dt><dd>{ca.kind}{ca.sub ? ` (${ca.sub})` : ''} · status <span className="tag">{ca.status}</span></dd>
            {ca.ex && <><dt>Ex-date</dt><dd className="mono">{fmtDate(ca.ex)}</dd></>}
            {ca.record && <><dt>Record date</dt><dd className="mono">{fmtDate(ca.record)}</dd></>}
            {ca.amount != null && <><dt>Amount</dt><dd className="mono">₹{ca.amount} per share</dd></>}
            {ca.ratio && <><dt>Ratio</dt><dd className="mono">{ca.ratio}</dd></>}
            <dt>Source</dt><dd>{ca.source} · <a className="link" href={ca.url} target="_blank" rel="noreferrer">Primary source <Icon n="ext" s={12} /></a> · <span className="faint">sample data</span></dd>
          </>}
          {ipo && <><dt>IPO</dt><dd><Link className="link" to={`/ipos/${ipo.slug}`}>{ipo.name}</Link> · {ipo.type}</dd></>}
          {r.link && <><dt>Open</dt><dd><Link className="link" to={r.link}>Related page →</Link></dd></>}
        </dl>
        <div className="row wrap">
          {r.status === 'done' || r.status === 'dismissed' ? <button className="btn" onClick={() => reopenRem(r.id)}>Reopen</button> : <>
            <button className="btn primary" onClick={() => { doneRem(r.id); nav('/reminders'); }}><Icon n="check" />Mark done</button>
            <SnoozeMenu r={r} align="left" />
            <button className="btn" onClick={() => { dismissRem(r.id); nav('/reminders'); }}>Dismiss</button>
          </>}
          <button className="btn ghost" onClick={startEdit}><Icon n="edit" />Edit</button>
          {isCustom && <button className="btn ghost danger" onClick={() => { update((s) => ({ ...s, custom: s.custom.filter((c) => c.id !== r.customId) })); nav('/reminders'); }}><Icon n="trash" />Delete</button>}
        </div>
      </div>
      <div className="card pad" style={{ marginTop: 16 }}>
        <h3 style={{ marginBottom: 10 }}>History</h3>
        <ul className="stack" style={{ margin: 0, paddingLeft: 18, gap: 6, fontSize: 14 }}>
          <li>Scheduled for <span className="mono">{fmtDateTime(r.orig)}</span></li>
          {r.status !== 'scheduled' && r.status !== 'snoozed' && r.status !== 'done' && r.status !== 'dismissed' && <li>Delivered</li>}
          {r.snoozes.map((t, i) => <li key={i}>Snoozed #{i + 1} at <span className="mono">{fmtDateTime(t)}</span></li>)}
          {r.doneAt && <li>Marked done at <span className="mono">{fmtDateTime(r.doneAt)}</span></li>}
          {r.status === 'dismissed' && <li>Dismissed</li>}
        </ul>
        {!isCustom && <p className="faint" style={{ fontSize: 12.5, marginTop: 10 }}>System reminders let you change time, priority and category, not the event facts.</p>}
      </div>
      {edit && (
        <Drawer title="Edit reminder" onClose={() => setEdit(false)} footer={<><button className="btn" onClick={() => setEdit(false)}>Cancel</button><button className="btn primary" onClick={save}>Save</button></>}>
          {isCustom && <><label className="f">Title<input className="input" maxLength={120} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></label><label className="f">Note<textarea className="textarea" maxLength={1000} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></label></>}
          <label className="f">Time (IST)<input className="input" type="datetime-local" value={f.due} onChange={(e) => setF({ ...f, due: e.target.value })} disabled={isCustom && r.repeat && r.repeat !== 'none'} /></label>
          <div className="grid g2">
            <label className="f">Priority<select className="select" value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value })}>{['High', 'Normal', 'Low'].map((p) => <option key={p}>{p}</option>)}</select></label>
            <label className="f">Category<select className="select" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>{catsAll.map((c) => <option key={c.key} value={c.key}>{st.catSettings[c.key]?.label || c.label}</option>)}</select></label>
          </div>
        </Drawer>
      )}
    </div>
  );
}
