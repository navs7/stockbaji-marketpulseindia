import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { buildInbox, clampSnooze, watchedSymbols } from './lib/engine.js';
import { firebaseEnabled, watchAuth, loadRemote, saveRemote, deleteRemote, fbSignOut } from './lib/firebase.js';
import { CATEGORIES } from './data/seed.js';

const KEY = 'mp.state';

export const DEFAULT_STATE = {
  user: null, // { uid, email, name, demo }
  acked: false,
  onboarded: false,
  theme: 'light',
  density: 'comfortable',
  profile: { name: '', timezone: 'Asia/Kolkata', language: 'English' },
  watchlists: [{ id: 'wl1', name: 'My watchlist', items: [] }],
  follows: { stock: {}, industry: {}, factor: {} },
  prefs: {
    quiet: { on: true, start: '22:00', end: '07:00' },
    highBypassQuiet: false,
    channels: { inapp: true, push: false, email: false },
    digestTime: '08:00', weekly: true, rateLimit: 20,
    exLead: 2, iposAuto: 'none', gmpFlag: true,
  },
  catSettings: {},
  customCategories: [],
  rules: [],
  custom: [],
  rem: {},
  iposRemind: {},
  applied: {},
  saved: {},
  read: {},
  quantities: {},
  adminEdits: {},
  extraActions: [],
  broadcasts: [],
  audit: [],
  approvedQueue: {},
  updatedAt: 0,
};

const merge = (base, over) => {
  if (!over || typeof over !== 'object' || Array.isArray(over)) return over ?? base;
  const out = { ...base };
  for (const k of Object.keys(over)) {
    out[k] = base && typeof base[k] === 'object' && !Array.isArray(base[k]) && base[k] !== null ? merge(base[k], over[k]) : over[k];
  }
  return out;
};

const readLocal = () => {
  try { return merge(DEFAULT_STATE, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch { return DEFAULT_STATE; }
};

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

export function AppProvider({ children }) {
  const [st, setSt] = useState(readLocal);
  const [now, setNow] = useState(() => new Date());
  const [toasts, setToasts] = useState([]);
  const [authReady, setAuthReady] = useState(!firebaseEnabled);
  const seen = useRef(new Set());
  const booted = useRef(false);
  const stRef = useRef(st);
  stRef.current = st;

  // update helper: patch via fn(draft-copy) => new state
  const update = useCallback((fn) => setSt((s) => ({ ...fn(s), updatedAt: Date.now() })), []);

  // persist locally
  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(st)); } catch { /* storage full or blocked */ }
    document.documentElement.dataset.theme = st.theme;
    document.documentElement.dataset.density = st.density;
  }, [st]);

  // clock: drives delivery of due reminders
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  const toast = useCallback((msg, opts = {}) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, msg, ...opts }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), opts.ms || 4500);
  }, []);

  // Firebase auth + Firestore sync
  useEffect(() => {
    return watchAuth(async (u) => {
      if (u) {
        const remote = await loadRemote(u.uid).catch(() => null);
        setSt((s) => {
          const base = remote?.state ? merge(DEFAULT_STATE, JSON.parse(remote.state)) : s;
          const useRemote = remote?.state && (JSON.parse(remote.state).updatedAt || 0) >= (s.updatedAt || 0);
          const chosen = useRemote ? base : s;
          return { ...chosen, user: { uid: u.uid, email: u.email, name: u.displayName || '', demo: false } };
        });
      } else if (booted.current) {
        setSt((s) => (s.user && !s.user.demo ? { ...s, user: null } : s));
      }
      booted.current = true;
      setAuthReady(true);
    });
  }, []);

  const syncTimer = useRef();
  useEffect(() => {
    if (!firebaseEnabled || !st.user || st.user.demo) return;
    clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      saveRemote(st.user.uid, { state: JSON.stringify({ ...st, user: null }), updatedAt: st.updatedAt || Date.now() }).catch(() => {});
    }, 1500);
  }, [st]);

  // Derived inbox
  const inbox = useMemo(() => buildInbox(st, now), [st, now]);

  // Fire in-app toast + browser notification for newly delivered, unmuted reminders
  useEffect(() => {
    const fresh = inbox.filter((r) => r.status === 'delivered' && !r.muted && !r.digest && !seen.current.has(r.id + (st.rem[r.id]?.snoozes?.length || 0)));
    if (!booted.current && seen.current.size === 0) {
      // first run: mark existing as seen without flooding
      fresh.forEach((r) => seen.current.add(r.id + (st.rem[r.id]?.snoozes?.length || 0)));
      return;
    }
    const recent = fresh.filter((r) => now - r.due < 10 * 60000);
    fresh.forEach((r) => seen.current.add(r.id + (st.rem[r.id]?.snoozes?.length || 0)));
    recent.slice(0, 3).forEach((r) => {
      toast(r.title, { link: r.link || '/reminders' });
      if (st.prefs.channels.push && 'Notification' in window && Notification.permission === 'granted') {
        try { new Notification(r.title.slice(0, 65), { body: r.body, icon: '/icon.svg', tag: r.id }); } catch { /* unsupported */ }
      }
    });
  }, [inbox]); // eslint-disable-line

  const act = useMemo(() => ({
    setRem: (id, patch) => update((s) => ({ ...s, rem: { ...s.rem, [id]: { ...(s.rem[id] || {}), ...patch } } })),
  }), [update]);

  const doneRem = (ids) => update((s) => {
    const rem = { ...s.rem };
    [].concat(ids).forEach((id) => { rem[id] = { ...(rem[id] || {}), status: 'done', doneAt: new Date().toISOString(), snoozeUntil: null }; });
    return { ...s, rem };
  });
  const dismissRem = (ids) => update((s) => {
    const rem = { ...s.rem };
    [].concat(ids).forEach((id) => { rem[id] = { ...(rem[id] || {}), status: 'dismissed', snoozeUntil: null }; });
    return { ...s, rem };
  });
  const reopenRem = (ids) => update((s) => {
    const rem = { ...s.rem };
    [].concat(ids).forEach((id) => { rem[id] = { ...(rem[id] || {}), status: 'scheduled', doneAt: null }; });
    return { ...s, rem };
  });
  // Returns { clamped, deadline } so callers can show the "Event closes at" message (FR-9.3)
  const snoozeRem = (r, at) => {
    const res = clampSnooze(at, r);
    update((s) => {
      const prev = s.rem[r.id] || {};
      return { ...s, rem: { ...s.rem, [r.id]: { ...prev, status: 'snoozed', snoozeUntil: res.at.toISOString(), snoozes: [...(prev.snoozes || []), new Date().toISOString()] } } };
    });
    return res;
  };

  const signOut = async () => {
    if (firebaseEnabled && st.user && !st.user.demo) await fbSignOut().catch(() => {});
    update((s) => ({ ...s, user: null }));
  };
  const deleteAccount = async () => {
    if (firebaseEnabled && st.user && !st.user.demo) await deleteRemote(st.user.uid).catch(() => {});
    localStorage.removeItem(KEY);
    setSt({ ...DEFAULT_STATE });
    if (firebaseEnabled) await fbSignOut().catch(() => {});
  };

  const followCount = Object.values(st.follows).reduce((n, o) => n + Object.keys(o).length, 0) + watchedSymbols(st).length;

  const value = { st, update, now, inbox, toast, toasts, setToasts, doneRem, dismissRem, reopenRem, snoozeRem, act, signOut, deleteAccount, authReady, followCount, cats: CATEGORIES };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
