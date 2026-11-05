import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../store.jsx';
import { categoryMeta, snoozePresets, clampSnooze, instBySym } from '../lib/engine.js';
import { CATEGORIES, INSTRUMENTS, INDUSTRIES, FACTORS, IPOS, ARTICLES } from '../data/seed.js';
import { fmtDateTime, fmtTime, toLocalInput, fromLocalInput } from '../lib/dates.js';

const P = {
  home: 'M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  bell: 'M6 9a6 6 0 1 1 12 0c0 6 2 7 2 7H4s2-1 2-7M10 20a2 2 0 0 0 4 0',
  rocket: 'M5 15c-1 1-2 4-2 6 2 0 5-1 6-2M14 4c3-1 6-1 7-1 0 1 0 4-1 7l-6 6-5-5zM9 12l-4-1 3-3 4 1M12 15l1 4 3-3-1-4M15 9h.01',
  compass: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM15.5 8.5l-2 5-5 2 2-5z',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',
  building: 'M4 21V6l8-3 8 3v15M9 21v-4h6v4M8 10h2M14 10h2M8 14h2M14 14h2',
  chart: 'M4 20V4M4 20h16M8 16v-5M12 16V8M16 16v-3',
  newspaper: 'M5 4h12v16H7a2 2 0 0 1-2-2zM17 8h3v10a2 2 0 0 1-2 2M8 8h6M8 12h6M8 16h4',
  scale: 'M12 3v18M6 21h12M5 7h14M5 7l-3 7a3 3 0 0 0 6 0zM19 7l-3 7a3 3 0 0 0 6 0z',
  globe: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18',
  landmark: 'M3 10l9-6 9 6M5 10v8M9 10v8M15 10v8M19 10v8M3 21h18',
  book: 'M5 4h13v16H7a2 2 0 0 1-2-2zM5 18a2 2 0 0 1 2-2h11',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  tag: 'M3 12V4h8l10 10-8 8zM7.5 8h.01',
  check: 'M4 12l5 5L20 6',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  x: 'M6 6l12 12M18 6L6 18',
  plus: 'M12 5v14M5 12h14',
  star: 'M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9z',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  ext: 'M14 4h6v6M20 4l-9 9M18 14v6H4V6h6',
  bookmark: 'M6 3h12v18l-6-4-6 4z',
  moon: 'M20 14A8 8 0 1 1 10 4a6.5 6.5 0 0 0 10 10z',
  sun: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  sliders: 'M4 6h10M18 6h2M4 12h2M10 12h10M4 18h12M20 18h0M14 4v4M8 10v4M16 16v4',
  repeat: 'M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3',
  download: 'M12 3v12M7 10l5 5 5-5M4 21h16',
  mail: 'M3 6h18v12H3zM3 7l9 7 9-7',
  zap: 'M13 2L4 14h7l-1 8 9-12h-7z',
  lock: 'M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4',
  pulse: 'M3 12h4l3-8 4 16 3-8h4',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v6M12 7.5h.01',
  edit: 'M4 20h4L19 9l-4-4L4 16zM13 7l4 4',
  filter: 'M3 5h18l-7 8v6l-4 2v-8z',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  share: 'M18 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 22a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM8.6 13.5l6.8 4M15.4 6.5l-6.8 4',
};
export const Icon = ({ n, s = 16, ...r }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...r}>
    <path d={P[n] || P.tag} />
  </svg>
);

export const Logo = ({ s = 28 }) => (
  <svg width={s} height={s} viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="14" fill="var(--accent)" /><path d="M10 36h10l6-16 8 28 7-20 4 8h9" fill="none" stroke="var(--accent-ink)" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

export const CatChip = ({ k }) => {
  const { st } = useApp();
  const m = categoryMeta(k, st, CATEGORIES);
  return <span className="chip" style={{ '--c': m.color }}><Icon n={m.icon} />{m.label}</span>;
};
export const useCat = () => { const { st } = useApp(); return (k) => categoryMeta(k, st, CATEGORIES); };

export const PageHead = ({ title, sub, children }) => (
  <div className="page-head"><div><h1>{title}</h1>{sub && <p>{sub}</p>}</div><div className="row wrap">{children}</div></div>
);

export const Empty = ({ title, children, action }) => (
  <div className="empty"><h3>{title}</h3><p>{children}</p>{action && <div style={{ marginTop: 14 }}>{action}</div>}</div>
);

export const Tabs = ({ tabs, value, onChange }) => (
  <div className="tabs" role="tablist">
    {tabs.map((t) => (
      <button key={t.key} role="tab" aria-selected={value === t.key} className={value === t.key ? 'on' : ''} onClick={() => onChange(t.key)}>
        {t.label}{t.count != null && <span className="count">{t.count}</span>}
      </button>
    ))}
  </div>
);

export const Switch = ({ checked, onChange, label }) => (
  <input type="checkbox" role="switch" className="switch" checked={!!checked} aria-label={label} onChange={(e) => onChange(e.target.checked)} />
);

export const AsOf = ({ at, stale, label = 'as of' }) => (
  <span className={'tag' + (stale ? ' amber' : '')} title="Source timestamp">{stale ? 'may be outdated · ' : ''}{label} {at ? fmtDateTime(at) : '—'}</span>
);

export const Disclaimer = ({ short }) => (
  <p className="faint" style={{ fontSize: 12.5 }}>
    Information only, not investment advice. MarketPulse does not recommend buying or selling any security.{' '}
    {!short && 'Dates and figures should be verified against the primary source (NSE, BSE, SEBI, RBI, the issuer) before acting. '}
    <Link to="/disclaimer" style={{ textDecoration: 'underline' }}>Read the full disclaimer</Link>
  </p>
);

// ---- Popover menu helper ----
export function useOutside(ref, onOut) {
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onOut(); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [ref, onOut]);
}

export function Drawer({ title, onClose, children, footer }) {
  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-modal="true" aria-label={title}>
        <div className="drawer-h"><h2>{title}</h2><button className="btn ghost icon-btn" onClick={onClose} aria-label="Close"><Icon n="x" s={18} /></button></div>
        <div className="drawer-b">{children}</div>
        {footer && <div className="drawer-f">{footer}</div>}
      </aside>
    </>
  );
}

// ---- Snooze menu (FR-9.1 to 9.4) ----
export function SnoozeMenu({ r, onDone, align }) {
  const { snoozeRem, now, toast } = useApp();
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState(false);
  const [cv, setCv] = useState(toLocalInput(new Date(now.getTime() + 3600000)));
  const ref = useRef();
  useOutside(ref, () => { setOpen(false); setCustom(false); });
  const go = (at) => {
    const res = snoozeRem(r, at);
    if (res.clamped) toast(`Event closes at ${fmtTime(res.deadline)}. Snoozed to ${fmtTime(res.at)} instead.`);
    else toast(`Snoozed until ${fmtDateTime(res.at)}`);
    setOpen(false); setCustom(false); onDone?.();
  };
  const presets = snoozePresets(now);
  return (
    <span style={{ position: 'relative' }} ref={ref}>
      <button className="btn sm" onClick={(e) => { e.stopPropagation(); setOpen(!open); }} aria-haspopup="menu" aria-expanded={open}><Icon n="clock" s={14} />Snooze</button>
      {open && (
        <div className="menu" role="menu" style={align === 'left' ? { left: 0, right: 'auto' } : null} onClick={(e) => e.stopPropagation()}>
          <div className="mh">Remind me again</div>
          {presets.map((p) => <button key={p.key} role="menuitem" onClick={() => go(p.at)}>{p.label}</button>)}
          <hr />
          {!custom ? <button role="menuitem" onClick={() => setCustom(true)}>Custom date and time…</button> : (
            <div style={{ padding: 8 }} className="stack">
              <input className="input" type="datetime-local" value={cv} onChange={(e) => setCv(e.target.value)} aria-label="Custom snooze time (IST)" />
              <button className="btn primary sm" onClick={() => go(fromLocalInput(cv))}>Snooze</button>
            </div>
          )}
        </div>
      )}
    </span>
  );
}

// ---- Command palette (Cmd/Ctrl+K) ----
export function CommandPalette({ onClose }) {
  const nav = useNavigate();
  const { inbox, st } = useApp();
  const [q, setQ] = useState('');
  const [i, setI] = useState(0);
  const items = useMemo(() => {
    const s = q.trim().toLowerCase();
    const fuzzy = (txt) => { if (!s) return true; const t = txt.toLowerCase(); if (t.includes(s)) return true; let k = 0; for (const c of t) { if (c === s[k]) k++; if (k === s.length) return true; } return false; };
    const out = [];
    INSTRUMENTS.forEach((x) => fuzzy(`${x.name} ${x.symbol} ${x.bse || ''} ${x.isin || ''}`) && out.push({ k: 'Stock', t: x.name, sub: x.symbol, to: `/stocks/${encodeURIComponent(x.symbol)}` }));
    IPOS.forEach((x) => fuzzy(x.name) && out.push({ k: 'IPO', t: x.name, sub: x.type, to: `/ipos/${x.slug}` }));
    INDUSTRIES.forEach((x) => fuzzy(x.name) && out.push({ k: 'Industry', t: x.name, to: `/industries/${x.slug}` }));
    FACTORS.forEach((x) => fuzzy(x.name) && out.push({ k: 'Factor', t: x.name, to: `/factors/${x.slug}` }));
    ARTICLES.forEach((x) => fuzzy(x.title) && out.push({ k: 'Article', t: x.title, sub: x.source, to: '/learn' }));
    inbox.forEach((x) => s && fuzzy(x.title) && out.push({ k: 'Reminder', t: x.title, to: `/reminders/${encodeURIComponent(x.id)}` }));
    return (s ? out : out.filter((o) => ['Stock', 'IPO'].includes(o.k)).slice(0, 8)).slice(0, 30);
  }, [q, inbox]);
  useEffect(() => setI(0), [q]);
  const pick = (it) => { if (it) { nav(it.to); onClose(); } };
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="modal" role="dialog" aria-modal="true" aria-label="Search">
        <input autoFocus className="cmdk-in" placeholder="Search stocks, IPOs, industries, factors, articles, reminders" value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowDown') { e.preventDefault(); setI((x) => Math.min(x + 1, items.length - 1)); }
            if (e.key === 'ArrowUp') { e.preventDefault(); setI((x) => Math.max(x - 1, 0)); }
            if (e.key === 'Enter') pick(items[i]);
          }} />
        <div className="cmdk-list">
          {items.length === 0 && <div className="empty">No matches for "{q}".</div>}
          {items.map((it, n) => (
            <button key={it.k + it.t + n} className={'cmdk-item' + (n === i ? ' on' : '')} onMouseEnter={() => setI(n)} onClick={() => pick(it)}>
              <span>{it.t}</span>{it.sub && <span className="faint mono" style={{ fontSize: 12 }}>{it.sub}</span>}<span className="k">{it.k}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

// ---- Stock picker (typeahead, FR-2.2) ----
export function StockSearch({ onPick, exclude = [], placeholder = 'Search name, NSE symbol, BSE code or ISIN' }) {
  const [q, setQ] = useState('');
  const res = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    const fuzzy = (txt) => { const t = txt.toLowerCase(); if (t.includes(s)) return 0; let k = 0; for (const c of t) { if (c === s[k]) k++; if (k === s.length) return 1; } return 9; };
    return INSTRUMENTS.map((x) => ({ x, sc: Math.min(fuzzy(x.name), fuzzy(x.symbol), x.bse ? fuzzy(x.bse) : 9, x.isin ? fuzzy(x.isin) : 9) })).filter((r) => r.sc < 9 && !exclude.includes(r.x.symbol)).sort((a, b) => a.sc - b.sc).slice(0, 7).map((r) => r.x);
  }, [q, exclude]);
  return (
    <div style={{ position: 'relative' }}>
      <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} aria-label="Search stocks" />
      {res.length > 0 && (
        <div className="menu" style={{ left: 0, right: 0, minWidth: 0 }}>
          {res.map((x) => (
            <button key={x.symbol} onClick={() => { onPick(x); setQ(''); }}><b>{x.symbol}</b> <span className="muted">{x.name}</span></button>
          ))}
        </div>
      )}
    </div>
  );
}

export function Tweaks() {
  const { st, update } = useApp();
  const [open, setOpen] = useState(false);
  return (
    <div className="tweaks">
      <button className="btn icon-btn" onClick={() => setOpen(!open)} aria-label="Tweaks" title="Tweaks"><Icon n="sliders" s={18} /></button>
      {open && (
        <div className="tweaks-p">
          <h4>Tweaks</h4>
          <div className="stack" style={{ gap: 6 }}>
            <span className="faint" style={{ fontSize: 12 }}>Theme</span>
            <div className="seg">{['light', 'dark'].map((t) => <button key={t} className={st.theme === t ? 'on' : ''} onClick={() => update((s) => ({ ...s, theme: t }))}>{t}</button>)}</div>
          </div>
          <div className="stack" style={{ gap: 6 }}>
            <span className="faint" style={{ fontSize: 12 }}>Density</span>
            <div className="seg">{['comfortable', 'compact'].map((t) => <button key={t} className={st.density === t ? 'on' : ''} onClick={() => update((s) => ({ ...s, density: t }))}>{t}</button>)}</div>
          </div>
          <label className="row" style={{ justifyContent: 'space-between', fontSize: 13.5 }}>Show indicative GMP (feature.gmp)<Switch checked={st.prefs.gmpFlag} onChange={(v) => update((s) => ({ ...s, prefs: { ...s.prefs, gmpFlag: v } }))} label="GMP flag" /></label>
        </div>
      )}
    </div>
  );
}

export const Initials = ({ name }) => <span className="chip" style={{ '--c': 'var(--accent)' }}>{(name || '?').slice(0, 2).toUpperCase()}</span>;
