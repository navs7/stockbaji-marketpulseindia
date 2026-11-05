import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../store.jsx';
import { PageHead, Tabs, Icon, Switch, Disclaimer, Empty } from '../components/ui.jsx';
import { CATEGORIES, INDUSTRIES, FACTORS, INSTRUMENTS } from '../data/seed.js';
import { categoryMeta } from '../lib/engine.js';

const ICONS = ['tag', 'star', 'bell', 'building', 'chart', 'globe', 'book', 'rocket', 'zap', 'shield'];
const COLORS = ['#0E5C4A', '#B4540A', '#2F5DA8', '#7A4EA3', '#9A6B00', '#B02A4B', '#1F7A8C', '#5A7D2B', '#5B6470'];
const row = { padding: '14px var(--pad)' };

function Notifications() {
  const { st, update, toast } = useApp();
  const p = st.prefs;
  const set = (patch) => update((s) => ({ ...s, prefs: { ...s.prefs, ...patch } }));
  const ask = async () => {
    if (!('Notification' in window)) return toast('Browser notifications aren’t supported here');
    const r = await Notification.requestPermission();
    set({ channels: { ...p.channels, push: r === 'granted' } });
    toast(r === 'granted' ? 'Browser notifications enabled' : 'Permission not granted');
  };
  return (
    <div className="stack" style={{ gap: 16 }}>
      <section className="card divide">
        <div className="card-h"><h3>Channels</h3></div>
        <label className="row" style={row}><Icon n="bell" /><span className="sp"><b>In-app</b><br /><span className="muted" style={{ fontSize: 13.5 }}>Bell, inbox and toasts. Always on.</span></span><Switch checked disabled label="In-app" onChange={() => {}} /></label>
        <div className="row" style={row}><Icon n="zap" /><span className="sp"><b>Web push</b><br /><span className="muted" style={{ fontSize: 13.5 }}>Installed PWA on Android, desktop and iOS 16.4+ home-screen apps. Without the Blaze functions, alerts fire while the app is open.</span></span>{p.channels.push ? <span className="tag green">On</span> : <button className="btn sm" onClick={ask}>Enable</button>}{p.channels.push && <button className="btn sm ghost" onClick={() => set({ channels: { ...p.channels, push: false } })}>Turn off</button>}</div>
        <label className="row" style={row}><Icon n="mail" /><span className="sp"><b>Email</b><br /><span className="muted" style={{ fontSize: 13.5 }}>Reminders with one-click Snooze and Done links, plus digests.</span></span><Switch checked={p.channels.email} onChange={(v) => set({ channels: { ...p.channels, email: v } })} label="Email" /></label>
        <p className="faint" style={{ ...row, fontSize: 13 }}>Telegram (v1.1), WhatsApp and SMS for High priority (v2) are not enabled yet.</p>
      </section>
      <section className="card divide">
        <div className="card-h"><h3>Quiet hours</h3></div>
        <label className="row" style={row}><span className="sp"><b>Hold non-critical alerts overnight</b><br /><span className="muted" style={{ fontSize: 13.5 }}>Items due in this window are delivered together when it ends.</span></span><Switch checked={p.quiet.on} onChange={(v) => set({ quiet: { ...p.quiet, on: v } })} label="Quiet hours" /></label>
        {p.quiet.on && <div className="row" style={row}><input className="input" type="time" style={{ width: 130 }} value={p.quiet.start} onChange={(e) => set({ quiet: { ...p.quiet, start: e.target.value } })} aria-label="Start" /><span className="faint">to</span><input className="input" type="time" style={{ width: 130 }} value={p.quiet.end} onChange={(e) => set({ quiet: { ...p.quiet, end: e.target.value } })} aria-label="End" /><span className="mono faint">IST</span></div>}
        <label className="row" style={row}><span className="sp"><b>High priority bypasses quiet hours</b></span><Switch checked={p.highBypassQuiet} onChange={(v) => set({ highBypassQuiet: v })} label="High priority bypass" /></label>
      </section>
      <section className="card divide">
        <div className="card-h"><h3>Digest and limits</h3></div>
        <div className="row" style={row}><span className="sp"><b>Daily digest time</b><br /><span className="muted" style={{ fontSize: 13.5 }}>Low and Normal items from digest-mode categories.</span></span><input className="input" type="time" style={{ width: 130 }} value={p.digestTime} onChange={(e) => set({ digestTime: e.target.value })} aria-label="Digest time" /></div>
        <label className="row" style={row}><span className="sp"><b>Weekly summary</b><br /><span className="muted" style={{ fontSize: 13.5 }}>Sundays 6:00 PM IST, with next week’s key dates.</span></span><Switch checked={p.weekly} onChange={(v) => set({ weekly: v })} label="Weekly" /></label>
        <div className="row" style={row}><span className="sp"><b>Instant pushes per day</b><br /><span className="muted" style={{ fontSize: 13.5 }}>High priority is exempt. Overflow goes to the next digest.</span></span><input className="input mono" type="number" min={1} max={50} style={{ width: 90 }} value={p.rateLimit} onChange={(e) => set({ rateLimit: Number(e.target.value) })} aria-label="Daily push limit" /></div>
      </section>
    </div>
  );
}

function Categories() {
  const { st, update, toast } = useApp();
  const cs = st.catSettings;
  const patch = (k, v) => update((s) => ({ ...s, catSettings: { ...s.catSettings, [k]: { ...(s.catSettings[k] || {}), ...v } } }));
  const all = [...CATEGORIES, ...st.customCategories];
  const [nc, setNc] = useState({ name: '', color: COLORS[0], icon: 'tag' });
  const [rule, setRule] = useState({ tag: '', category: 'personal' });
  const tagOpts = [...INDUSTRIES.map((i) => [i.slug, i.name]), ...FACTORS.map((f) => [f.slug, f.name]), ...INSTRUMENTS.map((i) => [i.symbol, i.symbol])];
  const addCat = () => {
    if (st.customCategories.length >= 20) return toast('Up to 20 custom categories');
    update((s) => ({ ...s, customCategories: [...s.customCategories, { key: 'c_' + Math.random().toString(36).slice(2, 7), label: nc.name.trim(), color: nc.color, icon: nc.icon, custom: true }] }));
    setNc({ name: '', color: COLORS[0], icon: 'tag' });
  };
  return (
    <div className="stack" style={{ gap: 16 }}>
      <section className="card tscroll">
        <table className="t"><thead><tr><th>Category</th><th>Colour</th><th>Mute</th><th>Digest</th><th>Bypass quiet</th><th /></tr></thead>
          <tbody>{all.map((c) => { const m = categoryMeta(c.key, st, CATEGORIES); const s = cs[c.key] || {}; return (
            <tr key={c.key}>
              <td><div className="row"><span className="chip" style={{ '--c': m.color }}><Icon n={m.icon} /></span><input className="input" style={{ minHeight: 32 }} value={m.label} onChange={(e) => patch(c.key, { label: e.target.value })} aria-label={`Label for ${c.label}`} /></div></td>
              <td><div className="row" style={{ gap: 4 }}>{COLORS.map((col) => <button key={col} aria-label={`Colour ${col}`} onClick={() => patch(c.key, { color: col })} style={{ width: 18, height: 18, borderRadius: 4, background: col, border: m.color === col ? '2px solid var(--ink)' : '1px solid var(--line-2)' }} />)}</div></td>
              <td><Switch checked={!!s.mute} onChange={(v) => patch(c.key, { mute: v })} label={`Mute ${c.label}`} /></td>
              <td><Switch checked={!!s.digest} onChange={(v) => patch(c.key, { digest: v })} label={`Digest ${c.label}`} /></td>
              <td><Switch checked={!!s.quietBypass} onChange={(v) => patch(c.key, { quietBypass: v })} label={`Bypass quiet hours ${c.label}`} /></td>
              <td>{c.custom && <button className="btn ghost icon-btn" aria-label="Delete category" onClick={() => update((x) => ({ ...x, customCategories: x.customCategories.filter((y) => y.key !== c.key) }))}><Icon n="trash" s={15} /></button>}</td>
            </tr>); })}</tbody></table>
        <p className="faint" style={{ fontSize: 12.5, padding: '10px 16px' }}>Colour is always paired with an icon and a label.</p>
      </section>
      <section className="card pad stack">
        <h3>New category <span className="faint" style={{ fontWeight: 400, fontSize: 13 }}>({st.customCategories.length}/20)</span></h3>
        <div className="row wrap"><input className="input" style={{ flex: 1, minWidth: 180 }} placeholder="e.g. My Bank Stocks" maxLength={30} value={nc.name} onChange={(e) => setNc({ ...nc, name: e.target.value })} aria-label="Category name" />
          <select className="select" style={{ width: 120 }} value={nc.icon} onChange={(e) => setNc({ ...nc, icon: e.target.value })} aria-label="Icon">{ICONS.map((i) => <option key={i}>{i}</option>)}</select>
          <div className="row" style={{ gap: 4 }}>{COLORS.map((col) => <button key={col} aria-label={`Colour ${col}`} onClick={() => setNc({ ...nc, color: col })} style={{ width: 22, height: 22, borderRadius: 5, background: col, border: nc.color === col ? '2px solid var(--ink)' : '1px solid var(--line-2)' }} />)}</div>
          <button className="btn primary" disabled={!nc.name.trim()} onClick={addCat}>Add</button></div>
      </section>
      <section className="card pad stack">
        <h3>Rules</h3><p className="muted" style={{ fontSize: 14 }}>Send reminders with a tag to a category, e.g. everything tagged “Banks” goes to “My Bank Stocks”.</p>
        <div className="row wrap"><span>Tagged</span><select className="select" style={{ width: 'auto' }} value={rule.tag} onChange={(e) => setRule({ ...rule, tag: e.target.value })} aria-label="Tag"><option value="">Choose…</option>{tagOpts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select><span>→</span>
          <select className="select" style={{ width: 'auto' }} value={rule.category} onChange={(e) => setRule({ ...rule, category: e.target.value })} aria-label="Category">{all.map((c) => <option key={c.key} value={c.key}>{cs[c.key]?.label || c.label}</option>)}</select>
          <button className="btn" disabled={!rule.tag} onClick={() => { update((s) => ({ ...s, rules: [...s.rules, { ...rule, id: Math.random().toString(36).slice(2, 7) }] })); setRule({ tag: '', category: rule.category }); }}>Add rule</button></div>
        {st.rules.map((r) => <div key={r.id} className="row card" style={{ padding: '8px 12px' }}><span className="sp"><b>{tagOpts.find(([v]) => v === r.tag)?.[1] || r.tag}</b> → {categoryMeta(r.category, st, CATEGORIES).label}</span><button className="btn ghost icon-btn" aria-label="Remove rule" onClick={() => update((s) => ({ ...s, rules: s.rules.filter((x) => x.id !== r.id) }))}><Icon n="x" s={15} /></button></div>)}
      </section>
    </div>
  );
}

function Leads() {
  const { st, update } = useApp();
  const p = st.prefs;
  const set = (patch) => update((s) => ({ ...s, prefs: { ...s.prefs, ...patch } }));
  return (
    <section className="card divide">
      <div className="card-h"><h3>Default lead times</h3></div>
      <div className="row" style={row}><span className="sp"><b>Dividend, bonus, split</b><br /><span className="muted" style={{ fontSize: 13.5 }}>Trading days before ex-date for the “last day to buy” alert.</span></span><select className="select" style={{ width: 140 }} value={p.exLead} onChange={(e) => set({ exLead: Number(e.target.value) })} aria-label="Trading days before ex-date">{[1, 2, 3, 5].map((n) => <option key={n} value={n}>{n} trading day{n > 1 ? 's' : ''}</option>)}</select></div>
      <p className="muted" style={{ ...row, fontSize: 14 }}>Other defaults follow the standard schedule: rights and buyback (announcement, record date, open, 2 days before close), board meetings (announcement, morning of, outcome), AGMs (7 days and 1 day before), global events (1 day and 30 minutes before).</p>
    </section>
  );
}

function Privacy() {
  const { st, deleteAccount, toast } = useApp();
  const nav = useNavigate();
  const [confirm, setConfirm] = useState(false);
  const exp = () => {
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), profile: st.profile, email: st.user?.email, watchlists: st.watchlists, follows: st.follows, preferences: st.prefs, categories: { settings: st.catSettings, custom: st.customCategories, rules: st.rules }, customReminders: st.custom, reminderStates: st.rem, saved: st.saved }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'marketpulse-export.json'; a.click(); URL.revokeObjectURL(a.href);
    toast('Export downloaded');
  };
  return (
    <div className="stack" style={{ gap: 16 }}>
      <section className="card pad stack"><h3>Export your data</h3><p className="muted">Download everything we hold about you as JSON.</p><div><button className="btn" onClick={exp}><Icon n="download" />Download JSON</button></div></section>
      <section className="card pad stack"><h3>Delete account</h3><p className="muted">Erases your profile, follows, watchlists and reminders. This cannot be undone.</p>
        {!confirm ? <div><button className="btn danger" onClick={() => setConfirm(true)}><Icon n="trash" />Delete my account</button></div> : <div className="row"><button className="btn danger" onClick={async () => { await deleteAccount(); nav('/'); }}>Yes, delete everything</button><button className="btn" onClick={() => setConfirm(false)}>Cancel</button></div>}</section>
      <section className="card pad stack"><h3>Legal</h3><div className="row wrap"><Link className="link" to="/disclaimer">Disclaimer</Link><span className="faint">Terms and Privacy policy: add your published URLs before launch.</span></div></section>
    </div>
  );
}

function Profile() {
  const { st, update, toast } = useApp();
  const [f, setF] = useState(st.profile);
  return (
    <section className="card pad stack" style={{ maxWidth: 560 }}>
      <label className="f">Name<input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
      <label className="f">Email<input className="input" value={st.user?.email || ''} readOnly /></label>
      <div className="grid g2"><label className="f">Time zone<select className="select" value={f.timezone} onChange={(e) => setF({ ...f, timezone: e.target.value })}><option>Asia/Kolkata</option></select></label><label className="f">Language<select className="select" value={f.language} onChange={(e) => setF({ ...f, language: e.target.value })}><option>English</option><option disabled>Hindi (coming later)</option></select></label></div>
      <div><button className="btn primary" onClick={() => { update((s) => ({ ...s, profile: f })); toast('Profile saved'); }}>Save</button></div>
    </section>
  );
}

export default function Settings() {
  const [tab, setTab] = useState('notifications');
  return (
    <div className="page" style={{ maxWidth: 940 }}>
      <PageHead title="Settings" />
      <Tabs value={tab} onChange={setTab} tabs={[{ key: 'profile', label: 'Profile' }, { key: 'notifications', label: 'Notifications' }, { key: 'categories', label: 'Categories' }, { key: 'leads', label: 'Lead times' }, { key: 'privacy', label: 'Data and privacy' }]} />
      {tab === 'profile' && <Profile />}{tab === 'notifications' && <Notifications />}{tab === 'categories' && <Categories />}{tab === 'leads' && <Leads />}{tab === 'privacy' && <Privacy />}
    </div>
  );
}
