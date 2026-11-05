import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../store.jsx';
import { PageHead, Tabs, Empty, Icon, Drawer, Switch, CatChip, Disclaimer } from '../components/ui.jsx';
import { FollowBtn } from './Stocks.jsx';
import { GLOBAL_EVENTS, FACTORS, INDUSTRIES, ARTICLES, IPOS } from '../data/seed.js';
import { instBySym, watchedSymbols } from '../lib/engine.js';
import { fmtDateTime, fmtDate, fmtTime, addDays, startOfDay, relDay, addDays as ad, withTime } from '../lib/dates.js';

const stars = (n) => '●'.repeat(n) + '○'.repeat(3 - n);

export function Global() {
  const { st, now } = useApp();
  const [tab, setTab] = useState('week');
  const [imp, setImp] = useState(1);
  const [mineOnly, setMineOnly] = useState(false);
  const mineInd = new Set([...Object.keys(st.follows.industry), ...watchedSymbols(st).map((s) => instBySym[s]?.industry)]);
  const hit = (g) => g.factors.some((f) => st.follows.factor[f]) || g.industries.some((i) => mineInd.has(i));
  const sod = startOfDay(now);
  const sched = GLOBAL_EVENTS.filter((g) => g.scheduled && g.importance >= imp && (!mineOnly || hit(g))).sort((a, b) => a.at - b.at);
  const lists = {
    today: sched.filter((g) => g.at >= sod && g.at < addDays(sod, 1)),
    week: sched.filter((g) => g.at >= sod && g.at < addDays(sod, 8)),
    later: sched.filter((g) => g.at >= addDays(sod, 8)),
    shocks: GLOBAL_EVENTS.filter((g) => !g.scheduled && g.importance >= imp && (!mineOnly || hit(g))).sort((a, b) => b.created - a.created),
  };
  const list = lists[tab];
  return (
    <div className="page">
      <PageHead title="Global events" sub="Scheduled releases in IST, and unscheduled shocks, each tagged with the factors and Indian sectors they may affect." />
      <div className="filters">
        <div className="seg" role="group" aria-label="Importance">{[[1, 'All'], [2, 'Medium+'], [3, 'High']].map(([v, l]) => <button key={v} className={imp === v ? 'on' : ''} onClick={() => setImp(v)}>{l}</button>)}</div>
        <label className="fchip" style={{ gap: 8 }}>Only what I follow<Switch checked={mineOnly} onChange={setMineOnly} label="Only what I follow" /></label>
      </div>
      <Tabs value={tab} onChange={setTab} tabs={[{ key: 'today', label: 'Today', count: lists.today.length }, { key: 'week', label: 'This week', count: lists.week.length }, { key: 'later', label: 'Later', count: lists.later.length }, { key: 'shocks', label: 'Unscheduled', count: lists.shocks.length }]} />
      {list.length ? <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))' }}>{list.map((g) => <EventCard key={g.id} g={g} followed={hit(g)} />)}</div> : <div className="card"><Empty title="Nothing here">Try a wider range or lower the importance filter.</Empty></div>}
    </div>
  );
}

function EventCard({ g, followed }) {
  const { now } = useApp();
  return (
    <article className="card pad stack" style={{ gap: 10 }}>
      <div className="row wrap"><span className="tag">{g.country}</span><span className="tag" title="Importance" style={{ letterSpacing: 2 }}>{stars(g.importance)}</span>{followed && <span className="tag accent">You follow this</span>}{!g.scheduled && <span className="tag red">Unscheduled</span>}</div>
      <h3 style={{ fontSize: 17 }}>{g.name}</h3>
      <div className="mono faint" style={{ fontSize: 12.5 }}>{g.scheduled ? <>{fmtDate(g.at)} · {fmtTime(g.at)} · {relDay(g.at, now)}</> : <>{fmtDateTime(g.created)} · {g.source}</>}</div>
      {g.scheduled && g.prev !== 'n/a' && <div className="row mono" style={{ fontSize: 12.5, gap: 18 }}><span><span className="faint">Prev</span> {g.prev}</span>{g.cons && g.cons !== 'n/a' && <span><span className="faint">Consensus</span> {g.cons}</span>}<span><span className="faint">Actual</span> —</span></div>}
      <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--r)', padding: '10px 12px' }}><div className="faint" style={{ fontSize: 11.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 3 }}>Why it matters for India</div><p style={{ fontSize: 14 }}>{g.why}</p></div>
      <div className="row wrap">{g.factors.map((f) => <Link key={f} to={`/factors/${f}`} className="tag accent">{FACTORS.find((x) => x.slug === f)?.name}</Link>)}{g.industries.map((i) => <Link key={i} to={`/industries/${i}`} className="tag">{INDUSTRIES.find((x) => x.slug === i)?.name}</Link>)}</div>
    </article>
  );
}

const TIER = { T1: 'Peer-reviewed / official', T2: 'Institutional research', T3: 'Reputable journalism' };

export function Learn() {
  const { st, update, toast } = useApp();
  const [tab, setTab] = useState('all');
  const [tier, setTier] = useState('all');
  const [topic, setTopic] = useState('all');
  const [follOnly, setFollOnly] = useState(false);
  const [unread, setUnread] = useState(false);
  const mine = useMemo(() => new Set([...Object.keys(st.follows.industry), ...Object.keys(st.follows.factor), ...watchedSymbols(st).map((s) => instBySym[s]?.industry)]), [st]);
  const score = (a) => a.tags.filter((t) => mine.has(t)).length;
  const list = ARTICLES.filter((a) => (tab !== 'saved' || st.saved[a.id]) && (tier === 'all' || a.tier === tier) && (topic === 'all' || a.topic === topic) && (!follOnly || score(a) > 0) && (!unread || !st.read[a.id]))
    .sort((a, b) => score(b) - score(a) || a.tier.localeCompare(b.tier) || b.published - a.published);
  const topics = [...new Set(ARTICLES.map((a) => a.topic))];
  const flip = (k, id) => update((s) => ({ ...s, [k]: { ...s[k], [id]: !s[k][id] } }));
  const remind = (a) => {
    const due = withTime(addDays(startOfDay(new Date()), 1), 18);
    update((s) => ({ ...s, custom: [...s.custom, { id: Math.random().toString(36).slice(2, 9), title: `Read: ${a.title}`.slice(0, 120), note: `${a.source} · ${a.mins} min`, due: due.toISOString(), category: 'learning', priority: 'Low', repeat: 'none', tags: [] }] }));
    toast('Reminder set for tomorrow 6:00 PM IST');
  };
  const share = async (a) => { try { await navigator.clipboard.writeText(`${location.origin}/learn#${a.id}`); toast('Link copied'); } catch { toast('Copy not available here'); } };
  return (
    <div className="page">
      <PageHead title="Learn" sub="A curated reading feed from a whitelisted source registry, ranked by what you follow, then source quality, then recency." />
      <Tabs value={tab} onChange={setTab} tabs={[{ key: 'all', label: 'Feed' }, { key: 'saved', label: 'Saved', count: Object.values(st.saved).filter(Boolean).length }]} />
      <div className="filters">
        <select className="select" style={{ width: 'auto' }} value={tier} onChange={(e) => setTier(e.target.value)} aria-label="Tier"><option value="all">All tiers</option>{Object.entries(TIER).map(([k, v]) => <option key={k} value={k}>{k} · {v}</option>)}</select>
        <select className="select" style={{ width: 'auto' }} value={topic} onChange={(e) => setTopic(e.target.value)} aria-label="Topic"><option value="all">All topics</option>{topics.map((t) => <option key={t}>{t}</option>)}</select>
        <button className={'fchip' + (follOnly ? ' on' : '')} aria-pressed={follOnly} onClick={() => setFollOnly(!follOnly)}>Followed only</button>
        <button className={'fchip' + (unread ? ' on' : '')} aria-pressed={unread} onClick={() => setUnread(!unread)}>Unread</button>
      </div>
      <div className="notice info" style={{ marginBottom: 14 }}><Icon n="info" /><span>Summaries are in our own words and link to the original. Articles are third-party views, not recommendations. Sample entries; links are placeholders.</span></div>
      {list.length ? <div className="stack">{list.map((a) => (
        <article key={a.id} id={a.id} className="card pad stack" style={{ gap: 8, opacity: st.read[a.id] ? .72 : 1 }}>
          <div className="row wrap"><span className="tag accent" title={TIER[a.tier]}>{a.tier} · {TIER[a.tier]}</span><span className="faint" style={{ fontSize: 13 }}>{a.source} · {fmtDate(a.published)} · {a.mins} min read</span>{score(a) > 0 && <span className="tag green">Matches your follows</span>}</div>
          <h3 style={{ fontSize: 18 }}>{a.title}</h3>
          <p className="muted">{a.summary}</p>
          <div className="row wrap"><span className="tag">{a.topic}</span>{a.tags.map((t) => <span key={t} className="tag">{FACTORS.find((f) => f.slug === t)?.name || INDUSTRIES.find((i) => i.slug === t)?.name || t}</span>)}</div>
          <div className="row wrap" style={{ marginTop: 4 }}>
            <a className="btn sm primary" href={a.url} onClick={(e) => { e.preventDefault(); toast('Sample article: no external link'); }}>Open source <Icon n="ext" s={12} /></a>
            <button className="btn sm" aria-pressed={!!st.saved[a.id]} onClick={() => flip('saved', a.id)}><Icon n="bookmark" s={14} />{st.saved[a.id] ? 'Saved' : 'Save'}</button>
            <button className="btn sm" onClick={() => flip('read', a.id)}><Icon n="check" s={14} />{st.read[a.id] ? 'Mark unread' : 'Mark read'}</button>
            <button className="btn sm" onClick={() => remind(a)}><Icon n="clock" s={14} />Remind me to read</button>
            <button className="btn sm ghost" onClick={() => share(a)}><Icon n="share" s={14} />Share</button>
          </div>
        </article>))}</div> : <div className="card"><Empty title={tab === 'saved' ? 'Nothing saved yet' : 'No articles match'}>Adjust the filters.</Empty></div>}
    </div>
  );
}

export function Subscriptions() {
  const { st, update } = useApp();
  const [edit, setEdit] = useState(null);
  const syms = watchedSymbols(st).concat(Object.keys(st.follows.stock).filter((s) => !watchedSymbols(st).includes(s)));
  const unique = [...new Set(Object.keys(st.follows.stock).concat(syms))];
  const Row = ({ type, k, label, to }) => {
    const f = st.follows[type][k] || {};
    return (
      <div className="row" style={{ padding: '10px var(--pad)' }}>
        <Link to={to} className="sp"><b>{label}</b><div className="faint" style={{ fontSize: 12.5 }}>{f.priority || 'Normal'} priority · {f.digest ? 'digest' : 'instant'}{f.channel ? ' · ' + f.channel : ''}</div></Link>
        <button className="btn sm" onClick={() => setEdit({ type, k, label })}><Icon n="sliders" s={14} />Settings</button>
        <Switch checked label={`Following ${label}`} onChange={() => update((s) => { const fo = { ...s.follows, [type]: { ...s.follows[type] } }; delete fo[type][k]; return { ...s, follows: fo, watchlists: type === 'stock' ? s.watchlists.map((w) => ({ ...w, items: w.items.filter((x) => x !== k) })) : s.watchlists }; })} />
      </div>
    );
  };
  const Sect = ({ title, icon, children, n }) => <section className="card"><div className="card-h"><h3><Icon n={icon} />{title}</h3><span className="tag">{n}</span></div>{n ? <div className="divide">{children}</div> : <Empty title="None yet">Follow some from the stock, industry or factor pages.</Empty>}</section>;
  const iposOn = Object.keys(st.iposRemind).filter((k) => st.iposRemind[k]);
  return (
    <div className="page">
      <PageHead title="Subscriptions" sub="Everything you follow, in one place. Tune update types, priority, channel and digest per item." />
      <div className="stack" style={{ gap: 16 }}>
        <Sect title="Stocks" icon="building" n={unique.length}>{unique.map((s) => <Row key={s} type="stock" k={s} label={`${s} · ${instBySym[s]?.name || ''}`} to={`/stocks/${encodeURIComponent(s)}`} />)}</Sect>
        <Sect title="Industries" icon="scale" n={Object.keys(st.follows.industry).length}>{Object.keys(st.follows.industry).map((k) => <Row key={k} type="industry" k={k} label={INDUSTRIES.find((i) => i.slug === k)?.name || k} to={`/industries/${k}`} />)}</Sect>
        <Sect title="Factors" icon="zap" n={Object.keys(st.follows.factor).length}>{Object.keys(st.follows.factor).map((k) => <Row key={k} type="factor" k={k} label={FACTORS.find((i) => i.slug === k)?.name || k} to={`/factors/${k}`} />)}</Sect>
        <section className="card"><div className="card-h"><h3><Icon n="rocket" />IPO reminders</h3><span className="tag">{st.prefs.iposAuto === 'none' ? iposOn.length : 'auto: ' + st.prefs.iposAuto}</span></div>
          {iposOn.length || st.prefs.iposAuto !== 'none' ? <div className="divide">{iposOn.map((k) => <div key={k} className="row" style={{ padding: '10px var(--pad)' }}><Link className="sp" to={`/ipos/${k}`}><b>{IPOS.find((p) => p.slug === k)?.name}</b></Link><Switch checked label="Remind" onChange={() => update((s) => ({ ...s, iposRemind: { ...s.iposRemind, [k]: false } }))} /></div>)}{st.prefs.iposAuto !== 'none' && <p className="muted" style={{ padding: '10px var(--pad)', fontSize: 14 }}>Auto-reminding for {st.prefs.iposAuto === 'all' ? 'all IPOs' : st.prefs.iposAuto === 'sme' ? 'all SME IPOs' : 'all mainboard IPOs'}. Change on the IPOs page.</p>}</div> : <Empty title="No IPO reminders">Toggle “Remind me” on an IPO.</Empty>}</section>
      </div>
      {edit && <SubSettings {...edit} onClose={() => setEdit(null)} />}
    </div>
  );
}

function SubSettings({ type, k, label, onClose }) {
  const { st, update } = useApp();
  const f = st.follows[type][k] || {};
  const set = (patch) => update((s) => ({ ...s, follows: { ...s.follows, [type]: { ...s.follows[type], [k]: { ...(s.follows[type][k] || {}), ...patch } } } }));
  const kinds = type === 'stock' ? [['corporate', 'Corporate actions'], ['news', 'News'], ['filings', 'Regulatory filings'], ['results', 'Results'], ['factor', 'Factor updates']] : type === 'industry' ? [['news', 'Sector news'], ['filings', 'Regulatory circulars'], ['corporate', 'Corporate actions of its stocks']] : [['news', 'Event alerts'], ['factor', 'Impact notes']];
  return (
    <Drawer title={label} onClose={onClose} footer={<button className="btn primary" onClick={onClose}>Done</button>}>
      <div className="stack">
        <div className="faint" style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Update types</div>
        {kinds.map(([key, l]) => <label key={key} className="row">{l}<span className="sp" /><Switch checked={f[key] !== false && (f[key] || key === 'news' || type === 'stock')} onChange={(v) => set({ [key]: v })} label={l} /></label>)}
      </div>
      <label className="f">Priority<select className="select" value={f.priority || 'Normal'} onChange={(e) => set({ priority: e.target.value })}>{['High', 'Normal', 'Low'].map((p) => <option key={p}>{p}</option>)}</select></label>
      <label className="f">Channel override<select className="select" value={f.channel || ''} onChange={(e) => set({ channel: e.target.value })}><option value="">Use category default</option><option value="in-app">In-app only</option><option value="push">Web push</option><option value="email">Email</option></select></label>
      <label className="row">Digest instead of instant<span className="sp" /><Switch checked={!!f.digest} onChange={(v) => set({ digest: v })} label="Digest" /></label>
    </Drawer>
  );
}

export function Explore() {
  const items = [['/calendar', 'Calendar', 'Corporate actions, IPOs and macro in one view', 'calendar'], ['/watchlists', 'Watchlists', 'Your stocks and their next events', 'star'], ['/global', 'Global events', 'Fed, OPEC, CPI and the sectors they may touch', 'globe'], ['/learn', 'Learn', 'Curated, tiered reading', 'book']];
  return (
    <div className="page"><PageHead title="Explore" />
      <div className="grid">{items.map(([to, l, d, ic]) => <Link key={to} to={to} className="card pad row"><Icon n={ic} s={22} /><div className="sp"><h3>{l}</h3><p className="muted" style={{ fontSize: 14 }}>{d}</p></div><Icon n="arrow" /></Link>)}</div></div>
  );
}

export function More() {
  const { st, update, signOut } = useApp();
  const items = [['/subscriptions', 'Subscriptions', 'list'], ['/settings', 'Settings', 'settings'], ['/admin', 'Admin console', 'shield'], ['/disclaimer', 'Disclaimer', 'info']];
  return (
    <div className="page"><PageHead title="More" />
      <div className="card divide">
        {items.map(([to, l, ic]) => <Link key={to} to={to} className="row" style={{ padding: '14px var(--pad)' }}><Icon n={ic} /><b className="sp">{l}</b><Icon n="arrow" s={14} /></Link>)}
        <label className="row" style={{ padding: '14px var(--pad)' }}><Icon n="moon" /><b className="sp">Dark theme</b><Switch checked={st.theme === 'dark'} onChange={(v) => update((s) => ({ ...s, theme: v ? 'dark' : 'light' }))} label="Dark theme" /></label>
        <button className="row" style={{ padding: '14px var(--pad)', border: 0, background: 'none', width: '100%' }} onClick={signOut}><Icon n="x" /><b className="sp" style={{ textAlign: 'left' }}>Sign out</b></button>
      </div></div>
  );
}
