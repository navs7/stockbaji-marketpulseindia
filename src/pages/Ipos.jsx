import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useApp } from '../store.jsx';
import { PageHead, Tabs, Empty, Icon, Switch, AsOf, Disclaimer } from '../components/ui.jsx';
import { IPOS, SEED_AS_OF } from '../data/seed.js';
import { fmtDay, fmtDate, fmtTime, inr, num, relDay, addDays, startOfDay, withTime } from '../lib/dates.js';

const stageOf = (p, now) => {
  if (p.status === 'upcoming' || now < p.open) return 'upcoming';
  if (now <= withTime(p.close, 17)) return 'open';
  if (now < withTime(p.listing, 10)) return 'closed';
  return 'listed';
};
const GMP_TXT = 'Unofficial, unregulated indicator from third-party trackers. Not published by SEBI, NSE or BSE. Do not deal in the grey market.';

function IpoCard({ p }) {
  const { st, update, now } = useApp();
  const on = !!st.iposRemind[p.slug];
  const stage = stageOf(p, now);
  const gmp = p.gmp?.length ? p.gmp[p.gmp.length - 1] : null;
  return (
    <article className="card ipo-card">
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <div className="sp"><Link to={`/ipos/${p.slug}`}><h3 style={{ fontSize: 18 }}>{p.name}</h3></Link><div className="faint" style={{ fontSize: 13, marginTop: 2 }}>{p.sector}</div></div>
        <span className={'tag ' + (p.type === 'SME' ? 'amber' : 'accent')}>{p.type}</span>
      </div>
      <div className="grid g2" style={{ gap: 10, fontSize: 13.5 }}>
        <div><div className="faint" style={{ fontSize: 11.5 }}>Dates</div><span className="mono">{fmtDay(p.open)} – {fmtDay(p.close)}</span></div>
        <div><div className="faint" style={{ fontSize: 11.5 }}>Price band</div><span className="mono">₹{p.band[0]}–{p.band[1]}</span></div>
        <div><div className="faint" style={{ fontSize: 11.5 }}>Lot / min. invest</div><span className="mono">{p.lot} sh · {inr(p.lot * p.band[1])}</span></div>
        <div><div className="faint" style={{ fontSize: 11.5 }}>Subscribed</div><span className="mono">{p.subs ? p.subs.total + 'x' : '—'}</span></div>
      </div>
      <div className="row wrap">
        {st.prefs.gmpFlag && gmp != null && <span className="tag" title={GMP_TXT}>GMP ₹{gmp} ({((gmp / p.band[1]) * 100).toFixed(1)}%) · unofficial</span>}
        <span className="sp" />
        {stage !== 'listed' && <label className="row" style={{ fontSize: 13.5, fontWeight: 600, gap: 8 }}>Remind me<Switch checked={on} onChange={(v) => update((s) => ({ ...s, iposRemind: { ...s.iposRemind, [p.slug]: v } }))} label={`Remind me about ${p.name}`} /></label>}
      </div>
    </article>
  );
}

export function IpoList() {
  const { st, update, now } = useApp();
  const [tab, setTab] = useState('open');
  const [type, setType] = useState('all');
  const withStage = IPOS.map((p) => ({ p, s: stageOf(p, now) })).filter((x) => type === 'all' || x.p.type === type);
  const groups = { open: withStage.filter((x) => x.s === 'open'), upcoming: withStage.filter((x) => x.s === 'upcoming'), closed: withStage.filter((x) => x.s === 'closed'), listed: withStage.filter((x) => x.s === 'listed') };
  const list = groups[tab].map((x) => x.p).sort((a, b) => a.close - b.close);
  return (
    <div className="page">
      <PageHead title="IPOs" sub="Mainboard and SME issues with dates, price band, subscription status and milestone reminders.">
        <label className="row card" style={{ padding: '8px 12px', fontSize: 13.5, fontWeight: 600 }}>Auto-remind
          <select className="select" style={{ width: 'auto', minHeight: 30, padding: '2px 8px' }} value={st.prefs.iposAuto} onChange={(e) => update((s) => ({ ...s, prefs: { ...s.prefs, iposAuto: e.target.value } }))} aria-label="Auto remind for IPOs">
            <option value="none">None (pick one by one)</option><option value="mainboard">All mainboard</option><option value="sme">All SME</option><option value="all">All IPOs</option>
          </select></label>
      </PageHead>
      <div className="row wrap" style={{ marginBottom: 14 }}>
        <div className="seg" role="group" aria-label="Type">{[['all', 'All'], ['Mainboard', 'Mainboard'], ['SME', 'SME']].map(([k, l]) => <button key={k} className={type === k ? 'on' : ''} onClick={() => setType(k)}>{l}</button>)}</div>
        <span className="tag amber">Sample issues</span>
      </div>
      <Tabs value={tab} onChange={setTab} tabs={[{ key: 'open', label: 'Open', count: groups.open.length }, { key: 'upcoming', label: 'Upcoming', count: groups.upcoming.length }, { key: 'closed', label: 'Closed / awaiting listing', count: groups.closed.length }, { key: 'listed', label: 'Listed (90 days)', count: groups.listed.length }]} />
      {list.length ? <div className="grid g3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>{list.map((p) => <IpoCard key={p.slug} p={p} />)}</div> : <div className="card"><Empty title="No IPOs here right now">Check the other tabs.</Empty></div>}
      {st.prefs.gmpFlag && <p className="faint" style={{ fontSize: 12.5, marginTop: 16 }}>{GMP_TXT}</p>}
    </div>
  );
}

function Spark({ data, h = 70, w = 280, fmt = (v) => v }) {
  if (!data?.length) return null;
  const max = Math.max(...data, 1);
  const pts = data.map((v, i) => [data.length === 1 ? w / 2 : (i / (data.length - 1)) * (w - 20) + 10, h - 12 - (v / max) * (h - 28)]);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" role="img" aria-label={`Trend: ${data.map(fmt).join(', ')}`}>
      <polyline fill="none" stroke="var(--accent)" strokeWidth="2.2" points={pts.map((p) => p.join(',')).join(' ')} strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => <g key={i}><circle cx={p[0]} cy={p[1]} r="3.5" fill="var(--accent)" /><text x={p[0]} y={p[1] - 8} textAnchor="middle" fontSize="10" fill="var(--ink-2)" fontFamily="var(--f-mono)">{fmt(data[i])}</text></g>)}
    </svg>
  );
}

export function IpoDetail() {
  const { slug } = useParams();
  const p = IPOS.find((x) => x.slug === slug);
  const { st, update, now } = useApp();
  const [tab, setTab] = useState('overview');
  if (!p) return <div className="page"><Empty title="IPO not found" action={<Link to="/ipos" className="btn">All IPOs</Link>}>This issue may have been withdrawn.</Empty></div>;
  const on = !!st.iposRemind[p.slug], applied = !!st.applied[p.slug];
  const stage = stageOf(p, now);
  const steps = [['Open', p.open], ['Close', p.close], ['Allotment', p.allot], ['Refund', p.refund], ['Listing', p.listing]];
  const cur = steps.reduce((c, [, d], i) => (now >= d ? i : c), -1);
  const gmpNow = p.gmp?.length ? p.gmp[p.gmp.length - 1] : null;
  const cats = p.subs ? [['QIB', p.subs.qib], ['NII – bNII', p.subs.bnii], ['NII – sNII', p.subs.snii], ['Retail', p.subs.retail], ['Employee', p.subs.emp], ['Total', p.subs.total]] : [];
  return (
    <div className="page">
      <Link to="/ipos" className="link row" style={{ marginBottom: 12 }}>← IPOs</Link>
      <div className="page-head">
        <div><div className="row wrap" style={{ marginBottom: 8 }}><span className={'tag ' + (p.type === 'SME' ? 'amber' : 'accent')}>{p.type}</span><span className="tag">{stage}</span><span className="tag amber">Sample</span></div><h1>{p.name}</h1><p>{p.sector} · {p.exchange} · {p.fresh ? `Fresh ₹${num(p.fresh)} cr` : ''}{p.ofs ? ` + OFS ₹${num(p.ofs)} cr` : ''}</p></div>
        <div className="row wrap">
          <label className="row card" style={{ padding: '8px 12px', fontWeight: 600, fontSize: 14 }}>Remind me<Switch checked={on} onChange={(v) => update((s) => ({ ...s, iposRemind: { ...s.iposRemind, [p.slug]: v } }))} label="Remind me" /></label>
          <label className="row card" style={{ padding: '8px 12px', fontWeight: 600, fontSize: 14 }}>I applied<Switch checked={applied} onChange={(v) => update((s) => ({ ...s, applied: { ...s.applied, [p.slug]: v }, iposRemind: v ? { ...s.iposRemind, [p.slug]: true } : s.iposRemind }))} label="I applied" /></label>
        </div>
      </div>
      <div className="card pad" style={{ marginBottom: 16 }}>
        <div className="timeline" aria-label="Status timeline">{steps.map(([l, d], i) => <div key={l} className={'st' + (i <= cur ? ' past' : '') + (i === cur ? ' now' : '')}><b>{l}</b>{fmtDay(d)}</div>)}</div>
      </div>
      <Tabs value={tab} onChange={setTab} tabs={[{ key: 'overview', label: 'Overview' }, { key: 'sub', label: 'Subscription' }, ...(st.prefs.gmpFlag ? [{ key: 'gmp', label: 'GMP' }] : []), { key: 'fin', label: 'Financials' }, { key: 'docs', label: 'Documents' }]} />
      {tab === 'overview' && (
        <div className="grid g2">
          <div className="card pad"><dl className="kv">
            <dt>Price band</dt><dd className="mono">₹{p.band[0]} – ₹{p.band[1]}</dd>
            <dt>Lot size</dt><dd className="mono">{p.lot} shares</dd>
            <dt>Min. investment</dt><dd className="mono">Retail {inr(p.lot * p.band[1])} · sNII {inr(Math.ceil(200000 / (p.lot * p.band[1])) * p.lot * p.band[1])}</dd>
            <dt>Issue size</dt><dd className="mono">₹{num(p.size)} cr</dd>
            <dt>Opens / closes</dt><dd className="mono">{fmtDate(p.open)} → {fmtDate(p.close)}</dd>
            <dt>UPI cut-off</dt><dd className="mono">{p.upi} IST on {fmtDay(p.close)}</dd>
            {p.anchor && <><dt>Anchor date</dt><dd className="mono">{fmtDate(p.anchor)}</dd></>}
          </dl></div>
          <div className="card pad"><dl className="kv">
            <dt>Allotment</dt><dd className="mono">{fmtDate(p.allot)}</dd>
            <dt>Refund / unblock</dt><dd className="mono">{fmtDate(p.refund)}</dd>
            <dt>Demat credit</dt><dd className="mono">{fmtDate(p.credit)}</dd>
            <dt>Listing</dt><dd className="mono">{fmtDate(p.listing)} · {p.exchange}</dd>
            <dt>Registrar</dt><dd>{p.registrar} · <a className="link" href="#" onClick={(e) => e.preventDefault()}>Allotment status <Icon n="ext" s={12} /></a></dd>
            <dt>Lead managers</dt><dd>{p.leads}</dd>
            <dt>Objects of the issue</dt><dd>{p.objects}</dd>
          </dl></div>
        </div>
      )}
      {tab === 'sub' && (
        <div className="grid g2">
          <div className="card"><div className="card-h"><h3>Category-wise subscription</h3><AsOf at={SEED_AS_OF} /></div>
            {p.subs ? <table className="t"><thead><tr><th>Category</th><th style={{ textAlign: 'right' }}>Times</th><th /></tr></thead><tbody>{cats.map(([l, v]) => <tr key={l}><td>{l}</td><td className="mono" style={{ textAlign: 'right' }}>{v.toFixed(2)}x</td><td style={{ width: '38%' }}><div className="bar-track"><div className="bar-fill" style={{ width: Math.min(100, v * 4 > 100 ? 100 : v * 4) + '%' }} /></div></td></tr>)}</tbody></table> : <Empty title="Bidding hasn’t started">Status refreshes every 30 minutes on open days during market hours.</Empty>}
          </div>
          <div className="card pad"><h3 style={{ marginBottom: 8 }}>Day-wise total subscription</h3>{p.subHist.length ? <Spark data={p.subHist} fmt={(v) => v + 'x'} /> : <p className="muted">No data yet.</p>}</div>
        </div>
      )}
      {tab === 'gmp' && st.prefs.gmpFlag && (
        <div className="grid g2">
          <div className="card pad stack"><div className="notice"><Icon n="info" /><span><b>{GMP_TXT}</b></span></div>
            {gmpNow != null ? <><div className="stat"><b className="mono">₹{gmpNow}</b><span>Indicative premium · {((gmpNow / p.band[1]) * 100).toFixed(1)}% of upper band</span></div><AsOf at={addDays(SEED_AS_OF, p.gmpDays || 0)} stale={p.gmpDays <= -2} /></> : <p className="muted">No indicative value available.</p>}
          </div>
          <div className="card pad"><h3 style={{ marginBottom: 8 }}>Day-wise trend (₹)</h3><Spark data={p.gmp || []} fmt={(v) => '₹' + v} /></div>
        </div>
      )}
      {tab === 'fin' && (
        <div className="card tscroll"><table className="t"><thead><tr><th>₹ crore</th><th style={{ textAlign: 'right' }}>Revenue</th><th style={{ textAlign: 'right' }}>PAT</th><th style={{ textAlign: 'right' }}>Net worth</th><th style={{ textAlign: 'right' }}>Borrowings</th></tr></thead>
          <tbody>{p.fin.map((r) => <tr key={r[0]}><td><b>{r[0]}</b></td>{r.slice(1).map((v, i) => <td key={i} className="mono" style={{ textAlign: 'right' }}>{num(v, v < 10 ? 1 : 0)}</td>)}</tr>)}</tbody></table>
          <p className="faint" style={{ fontSize: 12.5, padding: '10px 16px' }}>From the RHP. Illustrative figures for a sample issue.</p></div>
      )}
      {tab === 'docs' && <div className="card pad stack"><a className="link row" href="#" onClick={(e) => e.preventDefault()}><Icon n="ext" />Red Herring Prospectus (RHP)</a><a className="link row" href="#" onClick={(e) => e.preventDefault()}><Icon n="ext" />Registrar allotment status page</a><p className="faint" style={{ fontSize: 13 }}>Links are placeholders in the sample dataset.</p></div>}
      <div style={{ marginTop: 18 }}><Disclaimer /></div>
    </div>
  );
}
