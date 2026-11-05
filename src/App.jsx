import { useEffect, useState } from 'react';
import { Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from './store.jsx';
import { Icon, Logo, CommandPalette, Tweaks, Disclaimer } from './components/ui.jsx';
import { Landing, Login, Onboarding, Legal } from './pages/Public.jsx';
import Home from './pages/Home.jsx';
import { Reminders, ReminderDetail } from './pages/Reminders.jsx';
import CalendarPage from './pages/Calendar.jsx';
import { IpoList, IpoDetail } from './pages/Ipos.jsx';
import { Watchlists, StockPage, IndustryPage, FactorPage } from './pages/Stocks.jsx';
import { Global, Learn, Subscriptions, Explore, More } from './pages/Explore.jsx';
import Settings from './pages/Settings.jsx';
import Admin from './pages/Admin.jsx';
import { SAMPLE_NOTICE } from './data/seed.js';

const NAV = [
  ['/home', 'Home', 'home'], ['/reminders', 'Reminders', 'bell'], ['/calendar', 'Calendar', 'calendar'], ['/ipos', 'IPOs', 'rocket'],
  ['/watchlists', 'Watchlists', 'star'], ['/global', 'Global events', 'globe'], ['/learn', 'Learn', 'book'], ['/subscriptions', 'Subscriptions', 'list'],
];

function Ack() {
  const { update } = useApp();
  const [chk, setChk] = useState(false);
  return (
    <>
      <div className="scrim" style={{ zIndex: 90 }} />
      <div className="modal" style={{ zIndex: 91 }} role="dialog" aria-modal="true" aria-label="Disclaimer">
        <div className="card-h"><h2>Before you start</h2></div>
        <div className="stack" style={{ padding: 20 }}>
          <p><b>Information only, not investment advice.</b> MarketPulse reminds you of dates and events and links to primary sources. It never tells you what to buy, sell or hold, and it is not a SEBI-registered investment adviser or research analyst.</p>
          <p className="muted">IPO grey-market premium, where shown, is an unofficial and unregulated indicator from third-party trackers. Do not deal in the grey market.</p>
          <label className="row" style={{ alignItems: 'flex-start' }}><input type="checkbox" className="checkbox" checked={chk} onChange={(e) => setChk(e.target.checked)} style={{ marginTop: 3 }} /> <span>I understand and accept the <Link to="/disclaimer" target="_blank" className="link">full disclaimer</Link>.</span></label>
          <button className="btn primary" disabled={!chk} onClick={() => update((s) => ({ ...s, acked: true }))}>Continue</button>
        </div>
      </div>
    </>
  );
}

function Shell({ children }) {
  const { st, inbox, toasts, followCount, signOut } = useApp();
  const [cmd, setCmd] = useState(false);
  const loc = useLocation();
  const nav = useNavigate();
  const [sp, setSp] = useSearchParams();
  const { snoozeRem, doneRem, now } = useApp();

  useEffect(() => {
    const h = (e) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setCmd((c) => !c); } };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);
  useEffect(() => { window.scrollTo({ top: 0 }); }, [loc.pathname]);

  // Notification action buttons (Snooze 1h / Done) arrive as ?action=&rid= from the service worker
  useEffect(() => {
    const a = sp.get('action'), rid = sp.get('rid');
    if (a && rid) {
      const r = inbox.find((x) => x.id === rid);
      if (r) { if (a === 'done') doneRem(rid); if (a === 'snooze1h') snoozeRem(r, new Date(now.getTime() + 3600000)); }
      sp.delete('action'); sp.delete('rid'); setSp(sp, { replace: true });
    }
  }, [sp, inbox.length]); // eslint-disable-line

  const due = inbox.filter((r) => r.status === 'delivered' && !r.muted).length;
  const isAdmin = true; // demo: admin console is open. Production: custom claims (see firestore.rules)

  return (
    <div className="shell">
      <aside className="side nav" aria-label="Primary">
        <Link to="/home" className="brand"><Logo />MarketPulse</Link>
        {NAV.map(([to, label, ic]) => (
          <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'active' : '')}>
            <Icon n={ic} s={17} />{label}{to === '/reminders' && due > 0 && <span className="badge-n">{due}</span>}
          </NavLink>
        ))}
        <div className="grp">Account</div>
        <NavLink to="/settings" className={({ isActive }) => (isActive ? 'active' : '')}><Icon n="settings" s={17} />Settings</NavLink>
        {isAdmin && <NavLink to="/admin" className={({ isActive }) => (isActive ? 'active' : '')}><Icon n="shield" s={17} />Admin</NavLink>}
        <div className="sp" />
        <div className="faint" style={{ padding: '8px 10px', fontSize: 12.5 }}>{st.user?.name || st.user?.email}<br />{followCount} follows</div>
        <button className="navlike" onClick={signOut}>Sign out</button>
      </aside>
      <div className="main">
        <div className="sample-bar"><Icon n="info" s={14} />{SAMPLE_NOTICE}</div>
        <header className="topbar">
          <Link to="/home" className="brand hide-sm-desktop" style={{ padding: 0, display: 'none' }}><Logo /></Link>
          <button className="search-btn" onClick={() => setCmd(true)} aria-label="Search"><Icon n="search" />Search stocks, IPOs, reminders<span className="kbd">Ctrl K</span></button>
          <span className="sp" />
          <button className="btn ghost icon-btn" onClick={() => nav('/reminders')} aria-label={`Reminders, ${due} due`} style={{ position: 'relative' }}><Icon n="bell" s={19} />{due > 0 && <span className="badge-n" style={{ position: 'absolute', top: 0, right: -2 }}>{due}</span>}</button>
        </header>
        {children}
        <footer className="footer"><Disclaimer /></footer>
      </div>
      <nav className="tabbar" aria-label="Mobile">
        {[['/home', 'Home', 'home'], ['/reminders', 'Reminders', 'bell'], ['/ipos', 'IPOs', 'rocket'], ['/explore', 'Explore', 'compass'], ['/more', 'More', 'more']].map(([to, l, ic]) => (
          <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'active' : '')}><Icon n={ic} s={21} />{l}{to === '/reminders' && due > 0 && <span className="badge-n">{due}</span>}</NavLink>
        ))}
      </nav>
      <div className="toasts" aria-live="polite">
        {toasts.map((t) => <div key={t.id} className="toast"><Icon n="bell" s={16} /><span>{t.msg}</span>{t.link && <Link to={t.link}>Open</Link>}</div>)}
      </div>
      <Tweaks />
      {cmd && <CommandPalette onClose={() => setCmd(false)} />}
      {st.user && !st.acked && <Ack />}
    </div>
  );
}

export default function App() {
  const { st, authReady } = useApp();
  const loc = useLocation();
  if (!authReady) return <div className="empty" style={{ paddingTop: '30vh' }}>Loading…</div>;
  const authed = !!st.user;

  if (!authed) {
    return (
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/disclaimer" element={<Legal />} />
        <Route path="*" element={<Navigate to="/login" state={{ from: loc.pathname }} replace />} />
      </Routes>
    );
  }
  if (!st.onboarded && loc.pathname !== '/onboarding' && loc.pathname !== '/disclaimer') return <Navigate to="/onboarding" replace />;
  if (loc.pathname === '/onboarding') return <Onboarding />;

  return (
    <Shell>
      <Routes>
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/login" element={<Navigate to="/home" replace />} />
        <Route path="/home" element={<Home />} />
        <Route path="/reminders" element={<Reminders />} />
        <Route path="/reminders/:id" element={<ReminderDetail />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/ipos" element={<IpoList />} />
        <Route path="/ipos/:slug" element={<IpoDetail />} />
        <Route path="/watchlists" element={<Watchlists />} />
        <Route path="/stocks/:symbol" element={<StockPage />} />
        <Route path="/industries/:slug" element={<IndustryPage />} />
        <Route path="/factors/:slug" element={<FactorPage />} />
        <Route path="/global" element={<Global />} />
        <Route path="/learn" element={<Learn />} />
        <Route path="/subscriptions" element={<Subscriptions />} />
        <Route path="/explore" element={<Explore />} />
        <Route path="/more" element={<More />} />
        <Route path="/settings/*" element={<Settings />} />
        <Route path="/admin/*" element={<Admin />} />
        <Route path="/disclaimer" element={<Legal inApp />} />
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </Shell>
  );
}
