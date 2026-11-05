import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../store.jsx';
import { Icon, Logo, StockSearch, Switch, CatChip, Disclaimer } from '../components/ui.jsx';
import { firebaseEnabled, googleSignIn, sendEmailLink, finishEmailLink } from '../lib/firebase.js';
import { INDUSTRIES, INSTRUMENTS, NIFTY_POPULAR, CORPORATE_ACTIONS, IPOS, GLOBAL_EVENTS, SAMPLE_NOTICE } from '../data/seed.js';
import { fmtDay, istParts, MONTHS_LONG, inr } from '../lib/dates.js';
import { instBySym } from '../lib/engine.js';

const DB = ({ d }) => { const p = istParts(d); return <div className="datebox">{MONTHS_LONG[p.m].slice(0, 3)}<b>{p.d}</b></div>; };

export function Landing() {
  // Landing sample calendar: next few sample events across dividend, IPO and macro
  const sample = useMemo(() => {
    const now = new Date();
    const rows = [];
    const div = CORPORATE_ACTIONS.filter((a) => a.kind === 'dividend' && a.ex > now).sort((a, b) => a.ex - b.ex)[0];
    if (div) rows.push({ d: div.ex, t: `${instBySym[div.symbol].name} ex-dividend`, s: `₹${div.amount} per share · record ${fmtDay(div.record)}`, cat: 'corporate' });
    const ipo = IPOS.filter((p) => p.close > now).sort((a, b) => a.close - b.close)[0];
    if (ipo) rows.push({ d: ipo.close, t: `${ipo.name} IPO closes`, s: `Band ₹${ipo.band[0]}–${ipo.band[1]} · UPI cut-off ${ipo.upi}`, cat: 'ipo' });
    const g = GLOBAL_EVENTS.filter((e) => e.scheduled && e.at > now && e.importance === 3).sort((a, b) => a.at - b.at)[0];
    if (g) rows.push({ d: g.at, t: g.name, s: 'Why it matters for India, in plain language', cat: 'global' });
    return rows;
  }, []);
  return (
    <div className="land">
      <nav className="land-nav"><Link to="/" className="brand" style={{ padding: 0 }}><Logo />MarketPulse</Link><Link to="/login" className="btn">Sign in</Link></nav>
      <section className="hero">
        <div>
          <span className="tag accent">For Indian retail investors</span>
          <h1 style={{ marginTop: 14 }}>Never miss the date that <em>matters</em>.</h1>
          <p className="lede">Record dates, IPO deadlines, board meetings and the global events behind them. Pick what you follow, get one reminder at the right time, with a link to the primary source.</p>
          <div className="row wrap"><Link to="/login" className="btn primary" style={{ padding: '12px 22px' }}>Get started <Icon n="arrow" /></Link><span className="faint" style={{ fontSize: 13 }}>Setup in under 2 minutes · free</span></div>
        </div>
        <div className="paper" aria-label="Sample calendar">
          <div className="row" style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)' }}><b style={{ fontFamily: 'var(--f-display)' }}>This week, for you</b><span className="sp" /><span className="tag amber">Sample data</span></div>
          {sample.map((r, i) => (
            <div className="pr" key={i}><DB d={r.d} /><div><div style={{ fontWeight: 600 }}>{r.t}</div><div className="faint" style={{ fontSize: 13 }}>{r.s}</div></div><CatChip k={r.cat} /></div>
          ))}
        </div>
      </section>
      <section className="feat">
        {[['Right date, right time', 'Last day to buy for a dividend, not just the ex-date. Holiday-aware.', 'clock'], ['Only what you follow', 'Stocks, sectors and factors like crude or USD/INR. Nothing else.', 'filter'], ['Snooze, don’t lose', 'Snooze to 9 AM or before market open. We stop you snoozing past a deadline.', 'repeat'], ['Informs, never advises', 'No tips, no targets, no buy or sell calls. Sources on every fact.', 'shield']].map(([h, p, ic]) => (
          <div key={h}><Icon n={ic} s={20} /><h3 style={{ margin: '10px 0 6px' }}>{h}</h3><p className="muted" style={{ fontSize: 14 }}>{p}</p></div>
        ))}
      </section>
      <div style={{ padding: '10px clamp(16px,5vw,56px) 40px', marginTop: 'auto' }}><Disclaimer /></div>
    </div>
  );
}

export function Login() {
  const { update, toast } = useApp();
  const nav = useNavigate();
  const loc = useLocation();
  const [email, setEmail] = useState('');
  const [step, setStep] = useState('email');
  const [code, setCode] = useState('');
  const [otp, setOtp] = useState(null); // demo mode only
  const [tries, setTries] = useState(0);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { finishEmailLink().then((u) => u && nav('/home')).catch((e) => setErr(e.message)); }, []); // eslint-disable-line

  const enter = (user) => { update((s) => ({ ...s, user, profile: { ...s.profile, name: s.profile.name || user.name } })); nav('/home'); };
  const valid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);

  const sendCode = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      if (firebaseEnabled) { await sendEmailLink(email); setStep('sent'); }
      else { setOtp({ code: String(Math.floor(100000 + Math.random() * 900000)), exp: Date.now() + 10 * 60000 }); setTries(0); setStep('code'); }
    } catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  const verify = (e) => {
    e.preventDefault();
    if (Date.now() > otp.exp) return setErr('Code expired. Request a new one.');
    if (tries >= 5) return setErr('Too many attempts. Request a new code.');
    if (code === otp.code) return enter({ uid: 'demo-' + email, email, name: email.split('@')[0], demo: true });
    setTries(tries + 1); setErr(`Incorrect code. ${4 - tries} attempt${4 - tries === 1 ? '' : 's'} left.`);
  };
  const google = async () => {
    setErr('');
    try { if (firebaseEnabled) { await googleSignIn(); nav('/home'); } else enter({ uid: 'demo-google', email: 'demo.user@example.com', name: 'Demo User', demo: true }); }
    catch (x) { setErr(x.message); }
  };

  return (
    <div className="auth">
      <Link to="/" className="brand" style={{ padding: '0 0 24px' }}><Logo />MarketPulse</Link>
      <div className="card pad stack" style={{ gap: 16 }}>
        <div><h1 style={{ fontSize: 28 }}>Sign in or sign up</h1><p className="muted" style={{ marginTop: 6 }}>No passwords. We never store one.</p></div>
        {!firebaseEnabled && <div className="notice"><Icon n="info" /><span>Demo mode: Firebase isn’t configured, so sign-in is simulated and data stays in this browser.</span></div>}
        <button className="btn" onClick={google} style={{ minHeight: 42 }}><svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.7c4.3-4 6.9-9.9 6.9-17.1z"/><path fill="#FBBC05" d="M10.4 28.7c-.5-1.4-.8-2.9-.8-4.7s.3-3.2.8-4.7l-7.8-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.8-6.1z"/><path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-7.4-5.7c-2 1.4-4.7 2.2-7.8 2.2-6.3 0-11.7-4.1-13.6-9.8l-7.8 6.1C6.5 42.6 14.6 48 24 48z"/></svg>Continue with Google</button>
        <div className="row faint" style={{ fontSize: 12 }}><hr style={{ flex: 1, border: 0, borderTop: '1px solid var(--line)' }} />or with email<hr style={{ flex: 1, border: 0, borderTop: '1px solid var(--line)' }} /></div>
        {step === 'email' && (
          <form className="stack" onSubmit={sendCode}>
            <label className="f">Email<input className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></label>
            <button className="btn primary" disabled={!valid || busy}>{firebaseEnabled ? 'Email me a sign-in link' : 'Send 6-digit code'}</button>
          </form>
        )}
        {step === 'sent' && <div className="notice info"><Icon n="mail" /><span>Check <b>{email}</b> for a sign-in link. Open it on this device to finish.</span></div>}
        {step === 'code' && (
          <form className="stack" onSubmit={verify}>
            <div className="notice info"><Icon n="mail" /><span>In production this goes to <b>{email}</b>. Demo code: <b className="mono">{otp.code}</b> (10 min, 5 attempts)</span></div>
            <label className="f">6-digit code<input className="input mono" inputMode="numeric" maxLength={6} pattern="\d{6}" required autoFocus value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} style={{ fontSize: 20, letterSpacing: '.3em', textAlign: 'center' }} /></label>
            <button className="btn primary" disabled={code.length !== 6}>Verify and continue</button>
            <button type="button" className="btn ghost sm" onClick={() => { setStep('email'); setCode(''); setErr(''); }}>Use a different email</button>
          </form>
        )}
        {err && <p role="alert" style={{ color: 'var(--red)', fontSize: 13.5 }}>{err}</p>}
      </div>
      <div style={{ marginTop: 18 }}><Disclaimer short /></div>
    </div>
  );
}

const INTERESTS = [['ipo', 'IPOs', 'rocket'], ['div', 'Dividends and corporate actions', 'building'], ['sector', 'Sectors', 'scale'], ['macro', 'Global macro', 'globe'], ['learn', 'Learning', 'book']];

export function Onboarding() {
  const { st, update, toast } = useApp();
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [interests, setInterests] = useState(['ipo', 'div']);
  const [syms, setSyms] = useState([]);
  const [inds, setInds] = useState([]);
  const [email, setEmail] = useState(false);
  const [push, setPush] = useState('idle');
  const [quiet, setQuiet] = useState(st.prefs.quiet);

  const tog = (_arr, set, v) => set((a) => (a.includes(v) ? a.filter((x) => x !== v) : [...a, v]));
  const askPush = async () => {
    if (!('Notification' in window)) return setPush('unsupported');
    const r = await Notification.requestPermission();
    setPush(r);
  };
  const finish = () => {
    update((s) => {
      const follows = { ...s.follows, stock: { ...s.follows.stock }, industry: { ...s.follows.industry }, factor: { ...s.follows.factor } };
      inds.forEach((i) => (follows.industry[i] = { corporate: false, news: true }));
      if (interests.includes('macro')) ['rbi-repo', 'fed-rate', 'usd-inr', 'brent'].forEach((f) => (follows.factor[f] = { priority: 'Normal' }));
      const wl = s.watchlists.map((w, i) => (i === 0 ? { ...w, items: [...new Set([...w.items, ...syms])] } : w));
      return {
        ...s, onboarded: true, follows, watchlists: wl,
        prefs: { ...s.prefs, quiet, iposAuto: interests.includes('ipo') ? 'mainboard' : 'none', channels: { ...s.prefs.channels, email, push: push === 'granted' } },
      };
    });
    toast('You’re set. Your first reminders are in the inbox.');
    nav('/home');
  };
  const titles = ['What do you care about?', 'Add stocks you follow', 'Pick industries', 'How should we reach you?'];
  return (
    <div className="auth" style={{ maxWidth: 640, margin: '5vh auto' }}>
      <div className="row" style={{ marginBottom: 14 }}><Logo /><b style={{ fontFamily: 'var(--f-display)' }}>MarketPulse</b><span className="sp" /><span className="faint mono" style={{ fontSize: 12 }}>Step {step + 1} of 4</span></div>
      <div className="wiz-prog" role="progressbar" aria-valuemin={0} aria-valuemax={4} aria-valuenow={step + 1}><div className="bar-fill" style={{ width: `${((step + 1) / 4) * 100}%` }} /></div>
      <div className="card pad stack" style={{ marginTop: 18, gap: 18 }}>
        <h1 style={{ fontSize: 28 }}>{titles[step]}</h1>
        {step === 0 && <div className="pickgrid">{INTERESTS.map(([k, l, ic]) => <button key={k} className={'pick' + (interests.includes(k) ? ' on' : '')} aria-pressed={interests.includes(k)} onClick={() => tog(interests, setInterests, k)}><Icon n={ic} />{l}</button>)}</div>}
        {step === 1 && (<>
          <StockSearch exclude={syms} onPick={(x) => setSyms((a) => [...a, x.symbol])} />
          <div><div className="faint" style={{ fontSize: 12, marginBottom: 8 }}>Popular, from the NIFTY 50</div><div className="pickgrid">{NIFTY_POPULAR.map((s) => <button key={s} className={'pick' + (syms.includes(s) ? ' on' : '')} aria-pressed={syms.includes(s)} onClick={() => tog(syms, setSyms, s)}><b className="mono" style={{ fontSize: 12.5 }}>{s}</b></button>)}</div></div>
          {syms.filter((s) => !NIFTY_POPULAR.includes(s)).length > 0 && <div className="row wrap">{syms.filter((s) => !NIFTY_POPULAR.includes(s)).map((s) => <button key={s} className="fchip on" onClick={() => tog(syms, setSyms, s)}>{s} <Icon n="x" s={12} /></button>)}</div>}
        </>)}
        {step === 2 && <div className="pickgrid">{INDUSTRIES.map((i) => <button key={i.slug} className={'pick' + (inds.includes(i.slug) ? ' on' : '')} aria-pressed={inds.includes(i.slug)} onClick={() => tog(inds, setInds, i.slug)}>{i.name}</button>)}</div>}
        {step === 3 && (
          <div className="stack">
            <div className="card pad row" style={{ alignItems: 'flex-start' }}>
              <Icon n="bell" s={20} />
              <div className="sp"><b>Browser notifications</b><p className="muted" style={{ fontSize: 14, margin: '4px 0 10px' }}>We’ll ask your browser for permission next. You can change this any time. On iPhone, add the app to your Home Screen first (iOS 16.4+). {firebaseEnabled ? '' : 'Notifications fire while the app is open; background push needs the Blaze-plan functions in /functions.'}</p>
                {push === 'granted' ? <span className="tag green">Enabled</span> : push === 'denied' ? <span className="tag red">Blocked in browser settings</span> : push === 'unsupported' ? <span className="tag amber">Not supported here</span> : <button className="btn sm" onClick={askPush}>Enable browser notifications</button>}</div>
            </div>
            <label className="row card pad"><Icon n="mail" s={20} /><span className="sp"><b>Email</b><br /><span className="muted" style={{ fontSize: 14 }}>Reminders and your daily digest</span></span><Switch checked={email} onChange={setEmail} label="Email" /></label>
            <div className="card pad stack" style={{ gap: 10 }}>
              <label className="row"><span className="sp"><b>Quiet hours</b><br /><span className="muted" style={{ fontSize: 14 }}>Non-critical alerts wait until the end</span></span><Switch checked={quiet.on} onChange={(v) => setQuiet({ ...quiet, on: v })} label="Quiet hours" /></label>
              {quiet.on && <div className="row"><input className="input" type="time" value={quiet.start} onChange={(e) => setQuiet({ ...quiet, start: e.target.value })} aria-label="Quiet hours start" /><span className="faint">to</span><input className="input" type="time" value={quiet.end} onChange={(e) => setQuiet({ ...quiet, end: e.target.value })} aria-label="Quiet hours end" /><span className="faint mono">IST</span></div>}
            </div>
          </div>
        )}
        <div className="row">
          {step > 0 && <button className="btn ghost" onClick={() => setStep(step - 1)}>Back</button>}
          <span className="sp" />
          {step < 3 && <button className="btn ghost" onClick={() => setStep(step + 1)}>Skip</button>}
          {step < 3 ? <button className="btn primary" onClick={() => setStep(step + 1)}>Continue</button> : <button className="btn primary" onClick={finish}>Finish setup</button>}
        </div>
      </div>
    </div>
  );
}

export function Legal({ inApp }) {
  const body = (
    <div className="page" style={{ maxWidth: 780 }}>
      <h1 style={{ marginBottom: 18 }}>Disclaimer</h1>
      <div className="stack" style={{ gap: 14, fontSize: 15.5 }}>
        <p><b>Information only, not investment advice.</b> MarketPulse India reminds you of corporate actions, IPO milestones, regulatory and macro events and links to curated reading. It does not recommend buying, selling or holding any security, publishes no target prices or tips, and does not execute trades.</p>
        <p>MarketPulse is not a SEBI-registered investment adviser or research analyst. Articles shown are from a whitelisted source registry and are summarised in original words; they are third-party views, not our recommendations.</p>
        <p><b>Grey-market premium (GMP).</b> Where shown, GMP is an unofficial, unregulated indicator from third-party trackers. It is not published by SEBI, NSE or BSE. Do not deal in the grey market. It is never used to compute an expected gain.</p>
        <p><b>Impact language.</b> Notes such as “may affect” describe commonly discussed relationships between a factor and a sector. They are not predictions.</p>
        <p><b>Accuracy.</b> Event data can be revised or cancelled. Every fact shows its source and an “as of” time. Verify with the exchange filing or issuer before acting. {SAMPLE_NOTICE}</p>
        <p><b>Privacy.</b> Under the Digital Personal Data Protection Act, 2023 you can export your data as JSON and delete your account (Settings, Data and privacy). Account data is erased on deletion.</p>
      </div>
      {!inApp && <p style={{ marginTop: 24 }}><Link to="/login" className="link">Back</Link></p>}
    </div>
  );
  return inApp ? body : <div className="land">{body}</div>;
}
