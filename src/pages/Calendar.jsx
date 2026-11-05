import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../store.jsx';
import { PageHead, Empty, CatChip, Icon, useCat } from '../components/ui.jsx';
import { IPOS, GLOBAL_EVENTS, CATEGORIES } from '../data/seed.js';
import { allActions, watchedSymbols, instBySym, KIND_LABEL } from '../lib/engine.js';
import { atIst, addDays, istParts, ymd, fmtDate, fmtTime, MONTHS_LONG, DOW_SHORT, startOfDay, sameDay } from '../lib/dates.js';

const KINDS = [['dividend', 'Dividend'], ['bonus', 'Bonus'], ['split', 'Split'], ['rights', 'Rights'], ['buyback', 'Buyback'], ['agm', 'AGM'], ['board', 'Board']];

export function calendarItems(st, scope) {
  const w = new Set(watchedSymbols(st));
  const out = [];
  allActions(st).forEach((a) => {
    if (scope === 'watch' && !w.has(a.symbol)) return;
    const nm = instBySym[a.symbol]?.name || a.symbol;
    const cat = a.kind === 'board' ? 'results' : 'corporate';
    [['ex', 'ex-date'], ['record', 'record'], ['pay', 'payment'], ['meeting', ''], ['open', 'opens'], ['close', 'closes']].forEach(([k, l]) => a[k] && out.push({ d: a[k], t: `${nm} ${KIND_LABEL[a.kind].toLowerCase()}${l ? ' ' + l : ''}`, short: `${a.symbol} ${l || KIND_LABEL[a.kind].toLowerCase()}`, cat, kind: a.kind, to: `/stocks/${encodeURIComponent(a.symbol)}` }));
  });
  IPOS.forEach((p) => [['open', 'opens'], ['close', 'closes'], ['allot', 'allotment'], ['listing', 'lists']].forEach(([k, l]) => p[k] && out.push({ d: p[k], t: `${p.name} IPO ${l}`, short: `${p.name.split(' ')[0]} IPO ${l}`, cat: 'ipo', kind: 'ipo', to: `/ipos/${p.slug}` })));
  GLOBAL_EVENTS.filter((g) => g.scheduled).forEach((g) => out.push({ d: g.at, t: g.name, short: g.name, cat: g.country === 'India' ? 'indiamacro' : 'global', kind: 'global', to: '/global' }));
  return out;
}

export default function CalendarPage() {
  const { st, now, inbox } = useApp();
  const cat = useCat();
  const p0 = istParts(now);
  const [view, setView] = useState('month');
  const [ym, setYm] = useState({ y: p0.y, m: p0.m });
  const [sel, setSel] = useState(startOfDay(now));
  const [scope, setScope] = useState('watch');
  const [cats, setCats] = useState([]);
  const [kind, setKind] = useState('all');

  const items = useMemo(() => calendarItems(st, scope).filter((i) => (!cats.length || cats.includes(i.cat)) && (kind === 'all' || i.kind === kind)), [st, scope, cats, kind]);
  const byDay = useMemo(() => { const m = {}; items.forEach((i) => (m[ymd(i.d)] ||= []).push(i)); Object.values(m).forEach((a) => a.sort((x, y) => x.d - y.d)); return m; }, [items]);

  const first = atIst(ym.y, ym.m, 1);
  const lead = istParts(first).dow;
  const dim = new Date(Date.UTC(ym.y, ym.m + 1, 0)).getUTCDate();
  const cells = Array.from({ length: Math.ceil((lead + dim) / 7) * 7 }, (_, i) => addDays(first, i - lead));
  const move = (n) => setYm(({ y, m }) => { const d = new Date(Date.UTC(y, m + n, 1)); return { y: d.getUTCFullYear(), m: d.getUTCMonth() }; });
  const dayItems = byDay[ymd(sel)] || [];
  const listItems = items.filter((i) => i.d >= startOfDay(now)).sort((a, b) => a.d - b.d).slice(0, 80);

  return (
    <div className="page">
      <PageHead title="Calendar" sub="Corporate actions, IPO milestones and global events in one view. Times in IST; exchange holidays are accounted for.">
        <div className="seg" role="group" aria-label="View">{[['month', 'Month'], ['list', 'List']].map(([k, l]) => <button key={k} className={view === k ? 'on' : ''} onClick={() => setView(k)}>{l}</button>)}</div>
      </PageHead>
      <div className="filters">
        <div className="seg" role="group" aria-label="Scope">{[['watch', 'My watchlist'], ['all', 'All stocks']].map(([k, l]) => <button key={k} className={scope === k ? 'on' : ''} onClick={() => setScope(k)}>{l}</button>)}</div>
        <select className="select" style={{ width: 'auto' }} value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Event type"><option value="all">All event types</option>{KINDS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}<option value="ipo">IPO</option><option value="global">Global / macro</option></select>
        {CATEGORIES.filter((c) => ['corporate', 'ipo', 'results', 'global', 'indiamacro'].includes(c.key)).map((c) => (
          <button key={c.key} className={'fchip' + (cats.includes(c.key) ? ' on' : '')} style={{ '--c': cat(c.key).color }} aria-pressed={cats.includes(c.key)} onClick={() => setCats(cats.includes(c.key) ? cats.filter((x) => x !== c.key) : [...cats, c.key])}><span className="dot" /><Icon n={c.icon} s={12} />{cat(c.key).label}</button>
        ))}
      </div>

      {view === 'month' ? (
        <div className="grid g-main" style={{ alignItems: 'start' }}>
          <div>
            <div className="row" style={{ marginBottom: 10 }}>
              <button className="btn icon-btn" onClick={() => move(-1)} aria-label="Previous month">‹</button>
              <h2 style={{ minWidth: 160, textAlign: 'center' }}>{MONTHS_LONG[ym.m]} {ym.y}</h2>
              <button className="btn icon-btn" onClick={() => move(1)} aria-label="Next month">›</button>
              <button className="btn sm" onClick={() => { setYm({ y: p0.y, m: p0.m }); setSel(startOfDay(now)); }}>Today</button>
            </div>
            <div className="cal" role="grid">
              {DOW_SHORT.map((d) => <div key={d} className="dh" role="columnheader">{d}</div>)}
              {cells.map((d) => {
                const k = ymd(d), list = byDay[k] || [], p = istParts(d);
                return (
                  <button key={k} className={'cell' + (p.m !== ym.m ? ' out' : '') + (sameDay(d, now) ? ' today' : '') + (sameDay(d, sel) ? ' sel' : '')} onClick={() => setSel(d)} aria-label={`${fmtDate(d)}, ${list.length} items`}>
                    <span className="dn">{p.d}</span>
                    {list.slice(0, 3).map((it, i) => <span key={i} className="ev" style={{ '--c': cat(it.cat).color }}>{it.short}</span>)}
                    {list.length > 3 && <span className="more">+{list.length - 3} more</span>}
                    <span className="dots">{list.slice(0, 4).map((it, i) => <i key={i} style={{ width: 6, height: 6, borderRadius: 2, background: cat(it.cat).color }} />)}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <aside className="card" style={{ position: 'sticky', top: 70 }}>
            <div className="card-h"><h3>{fmtDate(sel)}</h3></div>
            {dayItems.length ? <div className="divide">{dayItems.map((it, i) => (
              <Link to={it.to} key={i} className="stack" style={{ padding: '10px var(--pad)', gap: 4 }}><b>{it.t}</b><span className="row"><CatChip k={it.cat} />{istParts(it.d).h > 0 && <span className="faint mono" style={{ fontSize: 12 }}>{fmtTime(it.d)}</span>}</span></Link>))}</div> : <Empty title="Nothing on this day">Pick another date or change filters.</Empty>}
          </aside>
        </div>
      ) : (
        <div className="card">{listItems.length ? <div className="divide">{listItems.map((it, i) => (
          <Link to={it.to} key={i} className="row" style={{ padding: '10px var(--pad)' }}>
            <div className="datebox" style={{ width: 52 }}>{DOW_SHORT[istParts(it.d).dow]}<b style={{ fontSize: 20 }}>{istParts(it.d).d}</b></div>
            <div className="sp"><b>{it.t}</b><div className="faint mono" style={{ fontSize: 12 }}>{fmtDate(it.d)}{istParts(it.d).h > 0 ? ' · ' + fmtTime(it.d) : ''}</div></div><CatChip k={it.cat} />
          </Link>))}</div> : <Empty title="No upcoming items">Widen the filters or switch to All stocks.</Empty>}</div>
      )}
    </div>
  );
}
