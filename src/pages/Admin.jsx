import { useState } from 'react';
import { useApp } from '../store.jsx';
import { PageHead, Tabs, Icon, Empty, AsOf } from '../components/ui.jsx';
import { REVIEW_QUEUE, SOURCES, INSTRUMENTS, FACTORS, INDUSTRIES, ARTICLES } from '../data/seed.js';
import { fmtDateTime, ymd, parseYmd, withTime } from '../lib/dates.js';

const PROPOSED = [
  { id: 'pa1', title: 'Liquidity conditions and money-market rates: a staff note', source: 'RBI', suggested: 'T1', topic: 'Banking' },
  { id: 'pa2', title: 'Top stock picks to buy this week', source: 'Unregistered tips channel', suggested: 'T3', topic: 'Tips', flagged: true },
  { id: 'pa3', title: 'Rating action on large private lenders: sector view', source: 'CARE Ratings', suggested: 'T2', topic: 'Banking' },
];

export default function Admin() {
  const { st, update, toast } = useApp();
  const [tab, setTab] = useState('queue');
  const log = (what) => update((s) => ({ ...s, audit: [{ at: new Date().toISOString(), who: s.user?.email || 'admin', what }, ...s.audit].slice(0, 200) }));
  const decide = (q, ok) => { update((s) => ({ ...s, approvedQueue: { ...s.approvedQueue, [q.id]: ok ? 'approved' : 'rejected' } })); log(`${ok ? 'Approved' : 'Rejected'} event: ${q.what}`); toast(ok ? 'Approved: notifications will go out' : 'Rejected'); };

  return (
    <div className="page">
      <PageHead title="Admin console" sub="Review ingested events, curate articles, broadcast alerts. Every change is written to the audit log." />
      <div className="notice" style={{ marginBottom: 16 }}><Icon n="shield" /><span>Prototype console: no access control here. In production restrict to the company Google domain with 2FA and enforce roles with Firebase custom claims (see <span className="mono">firestore.rules</span>).</span></div>
      <Tabs value={tab} onChange={setTab} tabs={[{ key: 'queue', label: 'Review queue', count: REVIEW_QUEUE.filter((q) => !st.approvedQueue[q.id]).length }, { key: 'events', label: 'Events' }, { key: 'catalogue', label: 'Catalogues' }, { key: 'articles', label: 'Articles' }, { key: 'broadcast', label: 'Broadcast' }, { key: 'health', label: 'Source health' }, { key: 'audit', label: 'Audit log', count: st.audit.length }]} />

      {tab === 'queue' && (
        <div className="stack">
          <p className="muted">Low-confidence events (parser disagreement, missing dates, below 0.9) wait here. No notification is sent until a human approves.</p>
          {REVIEW_QUEUE.map((q) => { const d = st.approvedQueue[q.id]; return (
            <div key={q.id} className="card pad row wrap">
              <div className="sp" style={{ minWidth: 240 }}><b>{q.what}</b><div className="muted" style={{ fontSize: 14 }}>{q.detail}</div><div className="row" style={{ marginTop: 6 }}><span className="tag amber">{q.reason}</span><span className="tag mono">confidence {q.conf.toFixed(2)}</span></div></div>
              {d ? <span className={'tag ' + (d === 'approved' ? 'green' : 'red')}>{d}</span> : <><button className="btn primary sm" onClick={() => decide(q, true)}>Approve</button><button className="btn sm" onClick={() => decide(q, false)}>Reject</button></>}
            </div>); })}
        </div>
      )}

      {tab === 'events' && <AddEvent log={log} />}

      {tab === 'catalogue' && (
        <div className="grid g2">
          <section className="card"><div className="card-h"><h3>Factors</h3><span className="tag">{FACTORS.length}</span></div><div className="divide">{FACTORS.map((f) => <div key={f.slug} style={{ padding: '10px var(--pad)' }}><b>{f.name}</b><div className="faint" style={{ fontSize: 12.5 }}>{f.industries.map((i) => INDUSTRIES.find((x) => x.slug === i)?.name).join(', ')}</div></div>)}</div></section>
          <section className="card"><div className="card-h"><h3>Instruments</h3><span className="tag">{INSTRUMENTS.length} (sample)</span></div><div className="divide" style={{ maxHeight: 420, overflowY: 'auto' }}>{INSTRUMENTS.map((i) => <div key={i.symbol} className="row" style={{ padding: '8px var(--pad)' }}><b className="mono" style={{ width: 110 }}>{i.symbol}</b><span className="muted sp">{i.name}</span><span className="tag">{i.cap}</span></div>)}</div></section>
          <p className="faint" style={{ gridColumn: '1 / -1', fontSize: 13 }}>Catalogues are read-only in this build; the sample taxonomy lives in <span className="mono">src/data/seed.js</span>. With Firestore enabled, move them to collections and edit here.</p>
        </div>
      )}

      {tab === 'articles' && <Articles log={log} />}
      {tab === 'broadcast' && <Broadcast log={log} />}

      {tab === 'health' && (
        <div className="card tscroll"><table className="t"><thead><tr><th>Job</th><th>Status</th><th>Last success</th><th style={{ textAlign: 'right' }}>Lag</th><th style={{ textAlign: 'right' }}>Error rate</th></tr></thead>
          <tbody>{SOURCES.map((s) => <tr key={s.name}><td><b>{s.name}</b></td><td><span className={'tag ' + (s.status === 'ok' ? 'green' : 'amber')}>{s.status === 'ok' ? 'healthy' : 'lagging'}</span></td><td className="mono">{fmtDateTime(s.lastOk)}</td><td className="mono" style={{ textAlign: 'right' }}>{s.lagMin} min</td><td className="mono" style={{ textAlign: 'right' }}>{s.errPct}%</td></tr>)}</tbody></table>
          <p className="faint" style={{ fontSize: 12.5, padding: '10px 16px' }}>Illustrative. The ingestion pipeline runs on Cloud Functions (Blaze); see <span className="mono">functions/</span>.</p></div>
      )}

      {tab === 'audit' && (
        <div className="card">{st.audit.length ? <div className="divide">{st.audit.map((a, i) => <div key={i} className="row" style={{ padding: '10px var(--pad)' }}><span className="mono faint" style={{ fontSize: 12, width: 190 }}>{fmtDateTime(a.at)}</span><span className="sp">{a.what}</span><span className="faint" style={{ fontSize: 12.5 }}>{a.who}</span></div>)}</div> : <Empty title="No changes yet">Admin actions will be recorded here.</Empty>}</div>
      )}
    </div>
  );
}

function AddEvent({ log }) {
  const { update, toast, st } = useApp();
  const [f, setF] = useState({ symbol: 'ITC', kind: 'dividend', ex: '', record: '', amount: '', ratio: '', purpose: '' });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const ok = f.ex && f.record && (f.kind === 'dividend' ? f.amount : f.ratio);
  const add = () => {
    const a = { id: 'x' + Math.random().toString(36).slice(2, 6), symbol: f.symbol, kind: f.kind, status: 'announced', source: 'Admin entry', face: 1, announced: new Date(), ex: parseYmd(f.ex), record: parseYmd(f.record), amount: f.kind === 'dividend' ? Number(f.amount) : undefined, ratio: f.ratio || undefined, purpose: f.purpose || 'Entered by admin', url: '#', sub: f.kind === 'dividend' ? 'Interim' : undefined };
    update((s) => ({ ...s, extraActions: [...s.extraActions, a] }));
    log(`Added ${f.kind} for ${f.symbol} (ex ${f.ex})`); toast('Event added. Followers get reminders from the next tick.');
  };
  return (
    <div className="grid g2" style={{ alignItems: 'start' }}>
      <section className="card pad stack"><h3>Add corporate action</h3>
        <div className="grid g2"><label className="f">Stock<select className="select" value={f.symbol} onChange={set('symbol')}>{INSTRUMENTS.map((i) => <option key={i.symbol}>{i.symbol}</option>)}</select></label>
          <label className="f">Type<select className="select" value={f.kind} onChange={set('kind')}>{['dividend', 'bonus', 'split'].map((k) => <option key={k}>{k}</option>)}</select></label>
          <label className="f">Ex-date<input className="input" type="date" value={f.ex} onChange={set('ex')} /></label>
          <label className="f">Record date<input className="input" type="date" value={f.record} onChange={set('record')} /></label>
          {f.kind === 'dividend' ? <label className="f">₹ per share<input className="input" inputMode="decimal" value={f.amount} onChange={set('amount')} /></label> : <label className="f">Ratio<input className="input" placeholder="1:1" value={f.ratio} onChange={set('ratio')} /></label>}
        </div>
        <label className="f">Purpose<input className="input" value={f.purpose} onChange={set('purpose')} /></label>
        <div><button className="btn primary" disabled={!ok} onClick={add}>Add event</button></div>
      </section>
      <section className="card"><div className="card-h"><h3>Added by admin</h3></div>{st.extraActions.length ? <div className="divide">{st.extraActions.map((a) => <div key={a.id} className="row" style={{ padding: '10px var(--pad)' }}><span className="sp"><b>{a.symbol}</b> {a.kind} · ex {ymd(a.ex)}</span><button className="btn ghost icon-btn" aria-label="Remove" onClick={() => { update((s) => ({ ...s, extraActions: s.extraActions.filter((x) => x.id !== a.id) })); log(`Removed event ${a.symbol} ${a.kind}`); }}><Icon n="trash" s={15} /></button></div>)}</div> : <Empty title="None">Events you add show here.</Empty>}</section>
    </div>
  );
}

function Articles({ log }) {
  const { st, update, toast } = useApp();
  const [checked, setChecked] = useState({});
  const [done, setDone] = useState({});
  return (
    <div className="stack">
      <p className="muted">Ingestion proposes; you approve, assign a tier and write a 2–3 line summary in original words. Articles that give specific buy or sell calls from unregistered persons are rejected.</p>
      {PROPOSED.map((p) => (
        <div key={p.id} className="card pad stack" style={{ gap: 8 }}>
          <div className="row wrap"><b className="sp" style={{ minWidth: 220 }}>{p.title}</b>{p.flagged && <span className="tag red">Looks like a tip</span>}<span className="tag">{p.source}</span><span className="tag accent">suggest {p.suggested}</span></div>
          <label className="row" style={{ alignItems: 'flex-start', fontSize: 14 }}><input type="checkbox" className="checkbox" style={{ marginTop: 3 }} checked={!!checked[p.id]} onChange={(e) => setChecked({ ...checked, [p.id]: e.target.checked })} />Checklist: no specific buy/sell/target call from an unregistered person; summary is original wording; source is whitelisted.</label>
          <div className="row">{done[p.id] ? <span className={'tag ' + (done[p.id] === 'published' ? 'green' : 'red')}>{done[p.id]}</span> : <><button className="btn primary sm" disabled={!checked[p.id] || p.flagged} onClick={() => { setDone({ ...done, [p.id]: 'published' }); log(`Published article: ${p.title}`); toast('Published to the feed (demo)'); }}>Approve and publish</button><button className="btn sm" onClick={() => { setDone({ ...done, [p.id]: 'rejected' }); log(`Rejected article: ${p.title}`); }}>Reject</button></>}</div>
        </div>))}
    </div>
  );
}

function Broadcast({ log }) {
  const { st, update, toast } = useApp();
  const [f, setF] = useState({ title: '', body: '', segment: 'followers', target: 'banks', second: '' });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const allUsers = f.segment === 'all';
  const needSecond = allUsers && (!f.second.trim() || f.second.trim().toLowerCase() === (st.user?.email || '').toLowerCase());
  const send = () => {
    const b = { id: Math.random().toString(36).slice(2, 7), at: new Date().toISOString(), title: f.title, body: f.body, segment: allUsers ? 'All users' : `Followers of ${f.target}`, approver: allUsers ? f.second : null };
    update((s) => ({ ...s, broadcasts: [b, ...s.broadcasts], custom: [...s.custom, { id: 'bc' + b.id, title: f.title.slice(0, 120), note: f.body, due: new Date().toISOString(), category: 'stocknews', priority: 'High', repeat: 'none', tags: [] }] }));
    log(`Broadcast to ${b.segment}: ${f.title}${allUsers ? ` (second approver: ${f.second})` : ''}`);
    toast('Broadcast sent (it appears in your own inbox as a preview)'); setF({ ...f, title: '', body: '', second: '' });
  };
  return (
    <div className="grid g2" style={{ alignItems: 'start' }}>
      <section className="card pad stack"><h3>New broadcast</h3>
        <label className="f">Segment<select className="select" value={f.segment} onChange={set('segment')}><option value="followers">Followers of…</option><option value="all">All users (needs two-person approval)</option></select></label>
        {!allUsers && <label className="f">Industry<select className="select" value={f.target} onChange={set('target')}>{INDUSTRIES.map((i) => <option key={i.slug} value={i.slug}>{i.name}</option>)}</select></label>}
        <label className="f">Title<input className="input" maxLength={65} value={f.title} onChange={set('title')} /><span className="hint">{f.title.length}/65</span></label>
        <label className="f">Message<textarea className="textarea" value={f.body} onChange={set('body')} /></label>
        {allUsers && <label className="f">Second approver’s email<input className="input" type="email" value={f.second} onChange={set('second')} /><span className="hint">Must differ from you. In production the second person approves in their own session.</span></label>}
        <div><button className="btn primary" disabled={!f.title.trim() || !f.body.trim() || needSecond} onClick={send}>Send broadcast</button></div>
      </section>
      <section className="card pad stack"><h3>Preview</h3>
        <div className="card pad" style={{ background: 'var(--surface-2)' }}><b>{f.title || 'Title appears here'}</b><p className="muted" style={{ marginTop: 4 }}>{f.body || 'Message appears here.'}</p></div>
        <h3 style={{ marginTop: 10 }}>Sent</h3>
        {st.broadcasts.length ? st.broadcasts.map((b) => <div key={b.id} className="card pad"><b>{b.title}</b><div className="faint mono" style={{ fontSize: 12 }}>{b.segment} · {fmtDateTime(b.at)}</div></div>) : <span className="muted">Nothing sent yet.</span>}
      </section>
    </div>
  );
}
