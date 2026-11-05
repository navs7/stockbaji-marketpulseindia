import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../store.jsx';
import { Icon, CatChip, PageHead, Empty, useCat } from '../components/ui.jsx';
import { ReminderRow } from './Reminders.jsx';
import { IPOS, ARTICLES, GLOBAL_EVENTS } from '../data/seed.js';
import { allActions, watchedSymbols, instBySym, KIND_LABEL } from '../lib/engine.js';
import { fmtDay, fmtDate, fmtTime, addDays, startOfDay, relDay, istParts, DOW_SHORT, ago } from '../lib/dates.js';

export function weekItems(st, now) {
  const from = startOfDay(now), to = addDays(from, 7);
  const w = new Set(watchedSymbols(st));
  const items = [];
  allActions(st).forEach((a) => {
    if (!w.has(a.symbol)) return;
    const nm = instBySym[a.symbol]?.name;
    [['ex', 'ex-date'], ['record', 'record date'], ['meeting', 'meeting'], ['open', 'opens'], ['close', 'closes'], ['pay', 'payment']].forEach(([k, l]) => {
      if (a[k] && a[k] >= from && a[k] < to) items.push({ d: a[k], t: `${nm} ${KIND_LABEL[a.kind].toLowerCase()} ${l}`, cat: a.kind === 'board' ? 'results' : 'corporate', to: `/stocks/${encodeURIComponent(a.symbol)}` });
    });
  });
  IPOS.forEach((p) => [['open', 'opens'], ['close', 'closes'], ['allot', 'allotment'], ['listing', 'lists']].forEach(([k, l]) => { if (p[k] && p[k] >= from && p[k] < to) items.push({ d: p[k], t: `${p.name} IPO ${l}`, cat: 'ipo', to: `/ipos/${p.slug}` }); }));
  GLOBAL_EVENTS.filter((g) => g.scheduled && g.at >= from && g.at < to && (g.importance === 3 || g.factors.some((f) => st.follows.factor[f]) || g.industries.some((i) => st.follows.industry[i]))).forEach((g) => items.push({ d: g.at, t: g.name, cat: g.country === 'India' ? 'indiamacro' : 'global', to: '/global' }));
  return items.sort((a, b) => a.d - b.d);
}

export default function Home() {
  const { st, inbox, now } = useApp();
  const cat = useCat();
  const eod = addDays(startOfDay(now), 1);
  const today = inbox.filter((r) => ['delivered', 'scheduled'].includes(r.status) && r.due < eod && !r.muted).slice(0, 5);
  const week = useMemo(() => weekItems(st, now), [st, now]);
  const open = IPOS.filter((p) => p.status === 'open');
  const w = new Set(watchedSymbols(st));
  const latest = useMemo(() => {
    const out = [];
    allActions(st).filter((a) => w.has(a.symbol) && a.announced <= now).forEach((a) => out.push({ d: a.announced, t: `${instBySym[a.symbol].name}: ${KIND_LABEL[a.kind].toLowerCase()} announced`, sub: a.purpose, src: a.source, to: `/stocks/${encodeURIComponent(a.symbol)}` }));
    GLOBAL_EVENTS.filter((g) => !g.scheduled && (g.factors.some((f) => st.follows.factor[f]) || g.industries.some((i) => st.follows.industry[i]))).forEach((g) => out.push({ d: g.created, t: g.name, sub: g.why, src: g.source, to: '/global' }));
    return out.sort((a, b) => b.d - a.d).slice(0, 5);
  }, [st, now]); // eslint-disable-line
  const reading = useMemo(() => {
    const tags = new Set([...Object.keys(st.follows.industry), ...Object.keys(st.follows.factor), ...[...w].map((s) => instBySym[s]?.industry)]);
    return [...ARTICLES].sort((a, b) => b.tags.filter((t) => tags.has(t)).length - a.tags.filter((t) => tags.has(t)).length || a.tier.localeCompare(b.tier)).slice(0, 3);
  }, [st]); // eslint-disable-line
  const dueN = inbox.filter((r) => r.status === 'delivered' && !r.muted).length;
  const hr = istParts(now).h;
  const greet = hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening';
  const nm = (st.profile.name || st.user?.name || '').split(' ')[0];

  return (
    <div className="page">
      <PageHead title={`${greet}${nm ? ', ' + nm : ''}`} sub={`${fmtDate(now)} · ${dueN ? `${dueN} reminder${dueN > 1 ? 's' : ''} need attention.` : 'Nothing needs attention right now.'}`}>
        <Link to="/reminders" className="btn primary">Open inbox</Link>
      </PageHead>

      <div className="grid g-main">
        <div className="stack" style={{ gap: 16 }}>
          <section className="card">
            <div className="card-h"><h3><Icon n="bell" />Today’s reminders</h3><Link to="/reminders" className="link">All reminders →</Link></div>
            {today.length ? <div className="divide">{today.map((r) => <ReminderRow key={r.id} r={r} compact />)}</div> : <Empty title="You’re clear for today" action={<Link to="/watchlists" className="btn">Follow stocks</Link>}>Follow stocks, sectors or IPOs and their key dates land here.</Empty>}
          </section>

          <section className="card">
            <div className="card-h"><h3><Icon n="calendar" />This week’s key dates</h3><Link to="/calendar" className="link">Calendar →</Link></div>
            {week.length ? <div className="divide">{week.slice(0, 8).map((it, i) => (
              <Link to={it.to} key={i} className="row" style={{ padding: '10px var(--pad)' }}>
                <div className="datebox" style={{ width: 44 }}>{DOW_SHORT[istParts(it.d).dow]}<b style={{ fontSize: 20 }}>{istParts(it.d).d}</b></div>
                <div className="sp" style={{ minWidth: 0 }}><div style={{ fontWeight: 600 }}>{it.t}</div><div className="faint mono" style={{ fontSize: 12 }}>{relDay(it.d, now)}{istParts(it.d).h ? ' · ' + fmtTime(it.d) : ''}</div></div>
                <span className="hide-sm"><CatChip k={it.cat} /></span>
              </Link>))}</div> : <Empty title="No key dates this week">Add stocks to a watchlist to see dividends, meetings and IPO milestones here.</Empty>}
          </section>

          <section className="card">
            <div className="card-h"><h3><Icon n="newspaper" />Latest from what you follow</h3></div>
            {latest.length ? <div className="divide">{latest.map((l, i) => (
              <Link key={i} to={l.to} className="stack" style={{ padding: '12px var(--pad)', gap: 3 }}>
                <b>{l.t}</b><span className="muted" style={{ fontSize: 13.5 }}>{l.sub}</span><span className="faint mono" style={{ fontSize: 12 }}>{l.src} · {ago(l.d, now)}</span>
              </Link>))}</div> : <Empty title="Nothing new yet">Follow a stock, industry or factor to see its updates.</Empty>}
          </section>
        </div>

        <div className="stack" style={{ gap: 16 }}>
          <section className="card">
            <div className="card-h"><h3><Icon n="rocket" />Open IPOs</h3><Link to="/ipos" className="link">All →</Link></div>
            {open.length ? <div className="divide">{open.map((p) => (
              <Link key={p.slug} to={`/ipos/${p.slug}`} className="stack" style={{ padding: '12px var(--pad)', gap: 6 }}>
                <div className="row"><b className="sp">{p.name}</b><span className="tag">{p.type}</span></div>
                <div className="faint mono" style={{ fontSize: 12.5 }}>₹{p.band[0]}–{p.band[1]} · closes {fmtDay(p.close)}, {p.upi} IST</div>
                <div className="row"><div className="bar-track sp"><div className="bar-fill" style={{ width: `${Math.min(100, (p.subs?.total || 0) * 20)}%` }} /></div><span className="mono" style={{ fontSize: 12 }}>{p.subs?.total}x</span></div>
              </Link>))}</div> : <Empty title="No IPO is open today">Upcoming ones are on the IPO page.</Empty>}
          </section>
          <section className="card">
            <div className="card-h"><h3><Icon n="book" />Recommended reading</h3><Link to="/learn" className="link">Learn →</Link></div>
            <div className="divide">{reading.map((a) => (
              <Link key={a.id} to="/learn" className="stack" style={{ padding: '12px var(--pad)', gap: 4 }}>
                <b style={{ lineHeight: 1.3 }}>{a.title}</b>
                <span className="faint" style={{ fontSize: 12.5 }}><span className="tag accent">{a.tier}</span> {a.source} · {a.mins} min</span>
              </Link>))}</div>
          </section>
        </div>
      </div>
    </div>
  );
}
