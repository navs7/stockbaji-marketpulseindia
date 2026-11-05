import { useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useApp } from '../store.jsx';
import { PageHead, Empty, Icon, Switch, StockSearch, CatChip, AsOf, Drawer, Disclaimer } from '../components/ui.jsx';
import { INSTRUMENTS, INDUSTRIES, FACTORS, ARTICLES, GLOBAL_EVENTS, IPOS, SEED_AS_OF } from '../data/seed.js';
import { allActions, instBySym, KIND_LABEL, watchedSymbols } from '../lib/engine.js';
import { fmtDate, fmtDay, inr, relDay, fmtDateTime } from '../lib/dates.js';

export function useFollow() {
  const { st, update, toast } = useApp();
  const has = (type, key) => type === 'stock' ? watchedSymbols(st).includes(key) || !!st.follows.stock[key] : !!st.follows[type][key];
  const toggle = (type, key, label) => {
    const on = has(type, key);
    update((s) => {
      const f = { ...s.follows, [type]: { ...s.follows[type] } };
      let wl = s.watchlists;
      if (on) {
        delete f[type][key];
        if (type === 'stock') wl = wl.map((w) => ({ ...w, items: w.items.filter((x) => x !== key) }));
      } else {
        f[type][key] = type === 'stock' ? { corporate: true, news: true, priority: 'Normal' } : { corporate: false, news: true, priority: 'Normal' };
        if (type === 'stock' && !wl.some((w) => w.items.includes(key))) wl = wl.map((w, i) => (i === 0 ? { ...w, items: [...w.items, key] } : w));
      }
      return { ...s, follows: f, watchlists: wl };
    });
    toast(on ? `Unfollowed ${label || key}` : `Following ${label || key}`);
  };
  return { has, toggle };
}

export const FollowBtn = ({ type, k, label, sm }) => {
  const { has, toggle } = useFollow();
  const on = has(type, k);
  return <button className={'btn' + (sm ? ' sm' : '') + (on ? '' : ' primary')} aria-pressed={on} onClick={() => toggle(type, k, label)}>{on ? <><Icon n="check" s={14} />Following</> : <><Icon n="plus" s={14} />Follow</>}</button>;
};

const nextEvent = (sym, st, now) => {
  const evs = [];
  allActions(st).filter((a) => a.symbol === sym).forEach((a) => ['ex', 'record', 'meeting', 'open', 'close'].forEach((k) => a[k] && a[k] >= now && evs.push({ d: a[k], t: `${KIND_LABEL[a.kind]} ${k === 'ex' ? 'ex-date' : k === 'meeting' ? '' : k}`.trim() })));
  return evs.sort((a, b) => a.d - b.d)[0];
};

export function Watchlists() {
  const { st, update, toast, now } = useApp();
  const [idx, setIdx] = useState(0);
  const [namer, setNamer] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const wl = st.watchlists[idx] || st.watchlists[0];
  const setWl = (fn) => update((s) => ({ ...s, watchlists: s.watchlists.map((w) => (w.id === wl.id ? fn(w) : w)) }));
  const add = (x) => {
    if (wl.items.length >= 200) return toast('A watchlist holds up to 200 instruments');
    setWl((w) => ({ ...w, items: [...new Set([...w.items, x.symbol])] }));
    update((s) => ({ ...s, follows: { ...s.follows, stock: { ...s.follows.stock, [x.symbol]: s.follows.stock[x.symbol] || { corporate: true, news: true, priority: 'Normal' } } } }));
    toast(`${x.symbol} added. Corporate-action alerts are on.`);
  };
  const remove = (sym) => setWl((w) => ({ ...w, items: w.items.filter((x) => x !== sym) }));
  const rename = (name) => { setWl((w) => ({ ...w, name })); setNamer(null); };
  const create = () => {
    if (st.watchlists.length >= 10) return toast('Up to 10 watchlists');
    const id = 'wl' + Math.random().toString(36).slice(2, 6);
    update((s) => ({ ...s, watchlists: [...s.watchlists, { id, name: 'New watchlist', items: [] }] }));
    setIdx(st.watchlists.length); setNamer('New watchlist');
  };
  const del = () => { if (st.watchlists.length < 2) return toast('Keep at least one watchlist'); update((s) => ({ ...s, watchlists: s.watchlists.filter((w) => w.id !== wl.id) })); setIdx(0); };
  return (
    <div className="page">
      <PageHead title="Watchlists" sub="Adding a stock subscribes you to its corporate-action alerts. Turn that off per stock if you only want to keep a list.">
        <button className="btn" onClick={() => setImportOpen(true)}><Icon n="download" />Import CSV</button>
        <button className="btn primary" onClick={create}><Icon n="plus" />New list</button>
      </PageHead>
      <div className="tabs" role="tablist">{st.watchlists.map((w, i) => <button key={w.id} role="tab" className={i === idx ? 'on' : ''} onClick={() => setIdx(i)}>{w.name}<span className="count">{w.items.length}</span></button>)}</div>
      <div className="row wrap" style={{ marginBottom: 14 }}>
        <div style={{ flex: 1, minWidth: 240, maxWidth: 480 }}><StockSearch exclude={wl.items} onPick={add} /></div>
        {namer == null ? <button className="btn ghost" onClick={() => setNamer(wl.name)}><Icon n="edit" />Rename</button> : <form className="row" onSubmit={(e) => { e.preventDefault(); rename(namer.trim() || wl.name); }}><input autoFocus className="input" value={namer} onChange={(e) => setNamer(e.target.value)} maxLength={40} aria-label="Watchlist name" /><button className="btn primary">Save</button></form>}
        <button className="btn ghost danger" onClick={del}><Icon n="trash" />Delete list</button>
      </div>
      <div className="card tscroll">
        {wl.items.length ? (
          <table className="t"><thead><tr><th>Stock</th><th className="hide-sm">Sector</th><th>Next event</th><th className="hide-sm" style={{ textAlign: 'right' }}>Qty</th><th>Alerts</th><th /></tr></thead>
            <tbody>{wl.items.map((s) => {
              const i = instBySym[s]; const ne = nextEvent(s, st, now); const on = st.follows.stock[s]?.corporate !== false;
              return (
                <tr key={s}>
                  <td><Link to={`/stocks/${encodeURIComponent(s)}`}><b>{s}</b><div className="faint" style={{ fontSize: 12.5 }}>{i?.name}</div></Link></td>
                  <td className="hide-sm muted">{INDUSTRIES.find((x) => x.slug === i?.industry)?.name}</td>
                  <td>{ne ? <><div>{ne.t}</div><div className="faint mono" style={{ fontSize: 12 }}>{fmtDay(ne.d)} · {relDay(ne.d, now)}</div></> : <span className="faint">None scheduled</span>}</td>
                  <td className="hide-sm" style={{ textAlign: 'right', width: 90 }}><input className="input mono" style={{ width: 80, minHeight: 30, textAlign: 'right' }} inputMode="numeric" value={st.quantities[s] || ''} placeholder="—" aria-label={`Quantity of ${s}`} onChange={(e) => update((x) => ({ ...x, quantities: { ...x.quantities, [s]: e.target.value.replace(/\D/g, '') } }))} /></td>
                  <td><Switch checked={on} label={`Corporate action alerts for ${s}`} onChange={(v) => update((x) => ({ ...x, follows: { ...x.follows, stock: { ...x.follows.stock, [s]: { ...(x.follows.stock[s] || { news: true, priority: 'Normal' }), corporate: v } } } }))} /></td>
                  <td><button className="btn ghost icon-btn" onClick={() => remove(s)} aria-label={`Remove ${s}`}><Icon n="x" s={16} /></button></td>
                </tr>);
            })}</tbody></table>
        ) : <Empty title="This list is empty" action={<button className="btn" onClick={() => setImportOpen(true)}>Import CSV</button>}>Search above to add stocks by name, NSE symbol, BSE code or ISIN.</Empty>}
      </div>
      <p className="faint" style={{ fontSize: 12.5, marginTop: 10 }}>Quantity is optional and stays on your account. It is only used to show an estimated dividend (before TDS).</p>
      {importOpen && <CsvImport wl={wl} onClose={() => setImportOpen(false)} setWl={setWl} />}
    </div>
  );
}

function CsvImport({ wl, setWl, onClose }) {
  const { update, toast } = useApp();
  const [rows, setRows] = useState(null);
  const [fix, setFix] = useState({});
  const parse = (txt) => {
    const lines = txt.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (!lines.length) return [];
    const head = lines[0].toLowerCase().split(',').map((x) => x.trim());
    const hasHead = head.some((h) => ['symbol', 'isin', 'quantity', 'qty'].includes(h));
    const body = hasHead ? lines.slice(1) : lines;
    const ci = hasHead ? Math.max(0, head.findIndex((h) => h === 'symbol' || h === 'isin')) : 0;
    const qi = hasHead ? head.findIndex((h) => h === 'quantity' || h === 'qty') : 1;
    return body.map((l, n) => {
      const c = l.split(',').map((x) => x.trim().replace(/^"|"$/g, ''));
      const key = c[ci]?.toUpperCase();
      const m = INSTRUMENTS.find((i) => i.symbol === key || i.isin === key || i.bse === key);
      return { n, raw: c[ci], qty: qi >= 0 ? c[qi] : '', sym: m?.symbol };
    });
  };
  const onFile = async (e) => { const f = e.target.files[0]; if (f) setRows(parse(await f.text())); };
  const bad = rows?.filter((r) => !r.sym && !fix[r.n]) || [];
  const commit = () => {
    const good = rows.map((r) => ({ ...r, sym: r.sym || fix[r.n] })).filter((r) => r.sym);
    setWl((w) => ({ ...w, items: [...new Set([...w.items, ...good.map((g) => g.sym)])].slice(0, 200) }));
    update((s) => {
      const stock = { ...s.follows.stock }, q = { ...s.quantities };
      good.forEach((g) => { stock[g.sym] ||= { corporate: true, news: true, priority: 'Normal' }; if (g.qty) q[g.sym] = g.qty.replace(/\D/g, ''); });
      return { ...s, follows: { ...s.follows, stock }, quantities: q };
    });
    toast(`${good.length} imported`); onClose();
  };
  return (
    <Drawer title="Import from CSV" onClose={onClose} footer={<><button className="btn" onClick={onClose}>Cancel</button>{rows && <button className="btn primary" onClick={commit}>Import {rows.filter((r) => r.sym || fix[r.n]).length}</button>}</>}>
      <p className="muted">Columns: <span className="mono">symbol</span> or <span className="mono">ISIN</span>, and optional <span className="mono">quantity</span>. Unmatched rows are listed so you can fix them.</p>
      <input type="file" accept=".csv,text/csv" onChange={onFile} className="input" aria-label="CSV file" />
      {rows && (<>
        <div className="row"><span className="tag green">{rows.filter((r) => r.sym).length} matched</span>{bad.length > 0 && <span className="tag red">{bad.length} unmatched</span>}</div>
        {rows.filter((r) => !r.sym).map((r) => (
          <div key={r.n} className="card pad stack" style={{ gap: 6 }}><span>Row {r.n + 1}: <b className="mono">{r.raw || '(empty)'}</b> not found</span>
            <select className="select" value={fix[r.n] || ''} onChange={(e) => setFix({ ...fix, [r.n]: e.target.value })} aria-label="Pick the right stock"><option value="">Skip this row</option>{INSTRUMENTS.map((i) => <option key={i.symbol} value={i.symbol}>{i.symbol} · {i.name}</option>)}</select></div>
        ))}
      </>)}
    </Drawer>
  );
}

export function StockPage() {
  const { symbol } = useParams();
  const sym = decodeURIComponent(symbol);
  const i = instBySym[sym];
  const { st, now } = useApp();
  if (!i) return <div className="page"><Empty title="Stock not found" action={<Link className="btn" to="/watchlists">Watchlists</Link>}>Search by name, NSE symbol, BSE code or ISIN.</Empty></div>;
  const ind = INDUSTRIES.find((x) => x.slug === i.industry);
  const factors = FACTORS.filter((f) => f.industries.includes(i.industry));
  const acts = allActions(st).filter((a) => a.symbol === sym);
  const dateOf = (a) => a.ex || a.record || a.meeting || a.open || a.announced;
  const upcoming = acts.filter((a) => [a.ex, a.record, a.meeting, a.open, a.close].some((d) => d && d >= now)).sort((a, b) => dateOf(a) - dateOf(b));
  const past = acts.filter((a) => !upcoming.includes(a)).sort((a, b) => dateOf(b) - dateOf(a));
  const feed = acts.filter((a) => a.announced <= now).sort((a, b) => b.announced - a.announced);
  const qty = Number(st.quantities[sym] || 0);
  const articles = ARTICLES.filter((a) => a.tags.includes(i.industry) || a.tags.some((t) => factors.some((f) => f.slug === t)));
  return (
    <div className="page">
      <div className="page-head">
        <div><div className="row wrap" style={{ marginBottom: 8 }}>{i.indexes.map((x) => <span key={x} className="tag">{x}</span>)}<span className="tag">{i.cap} cap</span></div><h1>{i.name}</h1>
          <p className="mono" style={{ fontSize: 13 }}>NSE {i.symbol}{i.bse ? ` · BSE ${i.bse}` : ''}{i.isin ? ` · ${i.isin}` : ''} · <Link className="link" to={`/industries/${i.industry}`}>{ind?.name}</Link></p></div>
        <FollowBtn type="stock" k={sym} label={i.symbol} />
      </div>
      <div className="grid g-main">
        <div className="stack" style={{ gap: 16 }}>
          <section className="card"><div className="card-h"><h3><Icon n="calendar" />Upcoming events</h3><AsOf at={SEED_AS_OF} /></div>
            {upcoming.length ? <div className="divide">{upcoming.map((a) => <ActionRow key={a.id} a={a} qty={qty} />)}</div> : <Empty title="No upcoming events">You’ll be reminded as soon as one is announced.</Empty>}</section>
          <section className="card"><div className="card-h"><h3>Past corporate actions</h3><span className="faint" style={{ fontSize: 12.5 }}>Sample dataset: recent only</span></div>
            {past.length ? <div className="divide">{past.map((a) => <ActionRow key={a.id} a={a} qty={qty} />)}</div> : <Empty title="None in the sample data">The full app shows five years of history.</Empty>}</section>
          <section className="card"><div className="card-h"><h3>Announcements</h3></div>
            {feed.length ? <div className="divide">{feed.map((a) => <div key={a.id} className="stack" style={{ padding: '12px var(--pad)', gap: 3 }}><b>{KIND_LABEL[a.kind]} announced</b><span className="muted" style={{ fontSize: 14 }}>{a.purpose}</span><span className="faint mono" style={{ fontSize: 12 }}>{a.source} · {fmtDateTime(a.announced)}</span></div>)}</div> : <Empty title="No announcements">Material filings appear here.</Empty>}</section>
        </div>
        <div className="stack" style={{ gap: 16 }}>
          <section className="card"><div className="card-h"><h3><Icon n="zap" />Things that move this stock</h3></div>
            <div className="divide"><div className="row" style={{ padding: '12px var(--pad)' }}><div className="sp"><b>{ind?.name}</b><div className="faint" style={{ fontSize: 12.5 }}>Industry</div></div><FollowBtn type="industry" k={i.industry} label={ind?.name} sm /></div>
              {factors.map((f) => <div key={f.slug} className="row" style={{ padding: '12px var(--pad)' }}><div className="sp"><Link to={`/factors/${f.slug}`}><b>{f.name}</b></Link><div className="faint" style={{ fontSize: 12.5 }}>may affect this sector</div></div><FollowBtn type="factor" k={f.slug} label={f.name} sm /></div>)}</div></section>
          <section className="card"><div className="card-h"><h3><Icon n="book" />Related reading</h3></div>
            {articles.length ? <div className="divide">{articles.slice(0, 3).map((a) => <Link to="/learn" key={a.id} className="stack" style={{ padding: '12px var(--pad)', gap: 3 }}><b style={{ lineHeight: 1.3 }}>{a.title}</b><span className="faint" style={{ fontSize: 12.5 }}>{a.tier} · {a.source}</span></Link>)}</div> : <Empty title="Nothing yet">—</Empty>}</section>
        </div>
      </div>
      <div style={{ marginTop: 18 }}><Disclaimer /></div>
    </div>
  );
}

function ActionRow({ a, qty }) {
  const rows = [['Announced', a.announced], ['Ex-date', a.ex], ['Record date', a.record], ['Meeting', a.meeting], ['Opens', a.open], ['Closes', a.close], ['Payment', a.pay]].filter(([, d]) => d);
  return (
    <div className="stack" style={{ padding: '14px var(--pad)', gap: 8 }}>
      <div className="row wrap"><b>{KIND_LABEL[a.kind]}{a.sub ? ` · ${a.sub}` : ''}</b>
        {a.amount != null && <span className="tag accent">₹{a.amount}/share</span>}{a.ratio && <span className="tag accent">{a.ratio}</span>}
        <span className={'tag ' + (a.status === 'revised' ? 'amber' : a.status === 'cancelled' ? 'red' : '')}>{a.status}</span></div>
      <div className="faint" style={{ fontSize: 13.5 }}>{a.purpose}</div>
      <div className="row wrap mono" style={{ fontSize: 12.5, gap: '4px 16px' }}>{rows.map(([l, d]) => <span key={l}><span className="faint">{l}</span> {fmtDay(d)}</span>)}</div>
      {a.kind === 'dividend' && qty > 0 && <span className="tag green" style={{ alignSelf: 'flex-start' }}>Estimate: {inr(qty * a.amount, 2)} for {qty} shares · before TDS</span>}
      <a className="link" href={a.url} target="_blank" rel="noreferrer">{a.source} source <Icon n="ext" s={12} /></a>
    </div>
  );
}

export function IndustryPage() {
  const { slug } = useParams();
  const ind = INDUSTRIES.find((x) => x.slug === slug);
  const { st, now } = useApp();
  if (!ind) return <div className="page"><Empty title="Industry not found" action={<Link className="btn" to="/subscriptions">Subscriptions</Link>}>—</Empty></div>;
  const stocks = INSTRUMENTS.filter((i) => i.industry === slug);
  const factors = FACTORS.filter((f) => f.industries.includes(slug));
  const w = new Set(watchedSymbols(st));
  const events = GLOBAL_EVENTS.filter((g) => g.industries.includes(slug)).sort((a, b) => (b.at || b.created) - (a.at || a.created));
  return (
    <div className="page">
      <div className="page-head"><div><span className="tag">{ind.macro}</span><h1 style={{ marginTop: 8 }}>{ind.name}</h1><p>{ind.blurb}</p></div><FollowBtn type="industry" k={slug} label={ind.name} /></div>
      <div className="grid g2">
        <section className="card"><div className="card-h"><h3>Stocks in this industry</h3></div>
          {stocks.length ? <div className="divide">{stocks.map((s) => <Link key={s.symbol} className="row" style={{ padding: '10px var(--pad)' }} to={`/stocks/${encodeURIComponent(s.symbol)}`}><div className="sp"><b>{s.symbol}</b> <span className="muted">{s.name}</span></div>{w.has(s.symbol) && <span className="tag accent">Following</span>}</Link>)}</div> : <Empty title="No stocks in the sample set">—</Empty>}</section>
        <div className="stack" style={{ gap: 16 }}>
          <section className="card"><div className="card-h"><h3>Mapped factors</h3></div><div className="divide">{factors.map((f) => <Link key={f.slug} to={`/factors/${f.slug}`} className="stack" style={{ padding: '12px var(--pad)', gap: 3 }}><b>{f.name}</b><span className="muted" style={{ fontSize: 13.5 }}>{f.note}</span></Link>)}</div></section>
          <section className="card"><div className="card-h"><h3>News and regulatory feed</h3></div>
            {events.length ? <div className="divide">{events.slice(0, 4).map((g) => <div key={g.id} className="stack" style={{ padding: '12px var(--pad)', gap: 3 }}><b>{g.name}</b><span className="muted" style={{ fontSize: 13.5 }}>{g.why}</span><span className="faint mono" style={{ fontSize: 12 }}>{fmtDate(g.at || g.created)}</span></div>)}</div> : <Empty title="No updates">Follow the industry to get new ones.</Empty>}</section>
        </div>
      </div>
    </div>
  );
}

export function FactorPage() {
  const { slug } = useParams();
  const f = FACTORS.find((x) => x.slug === slug);
  const { st, now } = useApp();
  if (!f) return <div className="page"><Empty title="Factor not found" action={<Link className="btn" to="/global">Global events</Link>}>—</Empty></div>;
  const inds = INDUSTRIES.filter((i) => f.industries.includes(i.slug));
  const mine = watchedSymbols(st).filter((s) => f.industries.includes(instBySym[s]?.industry));
  const evs = GLOBAL_EVENTS.filter((g) => g.factors.includes(slug)).sort((a, b) => (a.at || a.created) - (b.at || b.created));
  return (
    <div className="page">
      <div className="page-head"><div><span className="tag">Factor</span><h1 style={{ marginTop: 8 }}>{f.name}</h1><p>{f.note}</p></div><FollowBtn type="factor" k={slug} label={f.name} /></div>
      <div className="notice info" style={{ marginBottom: 16 }}><Icon n="info" /><span>“May affect” describes commonly discussed links, not predictions. Direction depends on the specific event and the company.</span></div>
      <div className="grid g2">
        <section className="card"><div className="card-h"><h3>What it touches</h3></div>
          <div className="divide">{inds.map((i) => <Link key={i.slug} to={`/industries/${i.slug}`} className="row" style={{ padding: '12px var(--pad)' }}><b className="sp">{i.name}</b><Icon n="arrow" s={14} /></Link>)}</div>
          <div style={{ padding: '12px var(--pad)', borderTop: '1px solid var(--line)' }}><div className="faint" style={{ fontSize: 12.5, marginBottom: 6 }}>Your followed stocks that may be affected</div>{mine.length ? <div className="row wrap">{mine.map((s) => <Link key={s} to={`/stocks/${encodeURIComponent(s)}`} className="tag accent">{s}</Link>)}</div> : <span className="muted" style={{ fontSize: 14 }}>None yet.</span>}</div></section>
        <section className="card"><div className="card-h"><h3>Upcoming and recent events</h3></div>
          {evs.length ? <div className="divide">{evs.map((g) => <div key={g.id} className="stack" style={{ padding: '12px var(--pad)', gap: 4 }}><b>{g.name}</b><span className="faint mono" style={{ fontSize: 12 }}>{fmtDateTime(g.at || g.created)}</span><span className="muted" style={{ fontSize: 13.5 }}>{g.why}</span></div>)}</div> : <Empty title="No events right now">Follow to be told when one is scheduled.</Empty>}</section>
      </div>
    </div>
  );
}
