import { useState, useEffect, useCallback, useRef } from "react";

// localStorage.clear()

// ─── Utility helpers ─────────────────────────────────────────────────────────
const generateId = () => Math.random().toString(36).slice(2, 10);
const now = () => new Date().toISOString();
const fmtDate = (iso) => new Date(iso).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" });
const fmtOvers = (balls) => `${Math.floor(balls / 6)}.${balls % 6}`;
const calcRR = (runs, balls) => balls === 0 ? 0 : ((runs / balls) * 6).toFixed(2);
const calcNRR = (forR, forB, agR, agB) => {
  const rFor = forB > 0 ? (forR / forB) * 6 : 0;
  const rAg  = agB  > 0 ? (agR  / agB)  * 6 : 0;
  return (rFor - rAg).toFixed(3);
};

// ─── Sample seed data ─────────────────────────────────────────────────────────
const SEED = (() => {
  const teams = [
    { id:"t1", name:"Street Strikers",   color:"#00D46A", players:["Rahul S","Karan M","Vijay P","Suresh T","Manoj K","Rohit D","Arjun B","Pranav S","Deepak R","Sanjay N","Lokesh V"] },
    { id:"t2", name:"Colony Champions",  color:"#FFB800", players:["Amit J","Nikhil C","Ravi A","Sunil G","Pradeep K","Harish M","Kiran B","Vinod P","Rakesh S","Ganesh T","Srinivas R"] },
  ];
  
  const history = [];
  const tournaments = [];

  return { teams, history, tournaments };
})();

// ─── Storage ──────────────────────────────────────────────────────────────────
const LS = {
  load: (key, def) => { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; } catch { return def; } },
  save: (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} },
};

// ─── Icons (inline SVG components) ───────────────────────────────────────────
const Icon = {
  Home: () => <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>,
  Cricket: () => <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><ellipse cx="12" cy="12" rx="10" ry="10" fill="none" stroke="currentColor" strokeWidth="2"/><line x1="8" y1="16" x2="16" y2="8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/><circle cx="17" cy="7" r="2.5"/></svg>,
  Teams: () => <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>,
  History: () => <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0 0 13 21a9 9 0 0 0 0-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/></svg>,
  Trophy: () => <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z"/></svg>,
  Plus: () => <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>,
  Back: () => <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>,
  Undo: () => <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z"/></svg>,
  Share: () => <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/></svg>,
  Edit: () => <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>,
  Close: () => <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>,
  Check: () => <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>,
  Ball: () => <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><circle cx="12" cy="12" r="10" fill="#c0392b"/><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8 8-8z" fill="rgba(0,0,0,0.3)"/></svg>,
  Star: () => <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>,
  Search: () => <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>,
  Delete: () => <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>,
};

// ─── CSS-in-JS styles ─────────────────────────────────────────────────────────
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600;700;800&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #0A0E1A; --card: #131929; --card2: #1A2440;
    --green: #00D46A; --amber: #FFB800; --red: #FF4757;
    --blue: #5352ED; --purple: #9C27B0; --teal: #00BCD4;
    --text: #F0F4FF; --muted: #8892AA; --border: #243050;
    --shadow: 0 4px 24px rgba(0,0,0,0.4);
  }
  body { background: var(--bg); color: var(--text); font-family: 'Inter', sans-serif; overflow-x: hidden; }
  .app { max-width: 480px; margin: 0 auto; min-height: 100vh; position: relative; padding-bottom: 80px; }
  .page { animation: fadeUp .25s ease; }
  @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:none; } }
  
  /* Nav */
  .bottom-nav { position:fixed; bottom:0; left:50%; transform:translateX(-50%); width:100%; max-width:480px; background:var(--card); border-top:1px solid var(--border); display:flex; z-index:100; }
  .nav-btn { flex:1; display:flex; flex-direction:column; align-items:center; gap:3px; padding:10px 4px 14px; color:var(--muted); border:none; background:none; cursor:pointer; font-size:10px; font-family:'Inter',sans-serif; font-weight:500; letter-spacing:.3px; transition:.2s; }
  .nav-btn.active { color:var(--green); }
  .nav-btn.active svg { filter: drop-shadow(0 0 6px var(--green)); }

  /* Cards */
  .card { background:var(--card); border:1px solid var(--border); border-radius:16px; padding:16px; margin-bottom:12px; }
  .card2 { background:var(--card2); border-radius:12px; padding:12px; margin-bottom:8px; }

  /* Header */
  .page-header { padding:20px 16px 12px; display:flex; align-items:center; gap:12px; }
  .page-title { font-size:22px; font-weight:800; letter-spacing:-.3px; }
  .back-btn { width:38px; height:38px; border-radius:10px; background:var(--card2); border:1px solid var(--border); display:flex; align-items:center; justify-content:center; cursor:pointer; flex-shrink:0; }

  /* Buttons */
  .btn { border:none; cursor:pointer; font-family:'Inter',sans-serif; font-weight:700; border-radius:12px; transition:.2s; }
  .btn-primary { background:var(--green); color:#000; padding:14px 24px; width:100%; font-size:16px; border-radius:14px; }
  .btn-primary:active { transform:scale(.97); }
  .btn-secondary { background:var(--card2); color:var(--text); border:1px solid var(--border); padding:12px 20px; font-size:14px; }
  .btn-danger { background:rgba(255,71,87,.15); color:var(--red); border:1px solid rgba(255,71,87,.3); padding:10px 16px; font-size:14px; }
  .btn-ghost { background:transparent; color:var(--muted); padding:8px 12px; font-size:13px; }
  
  /* Score display */
  .score-hero { background:linear-gradient(135deg,#131929 0%,#0d1926 100%); border:1px solid var(--border); border-radius:20px; padding:20px; margin:12px 16px; }
  .score-runs { font-family:'Bebas Neue',cursive; font-size:72px; line-height:1; color:var(--text); letter-spacing:2px; }
  .score-wkts { font-family:'Bebas Neue',cursive; font-size:40px; color:var(--muted); }
  .score-overs { font-size:15px; color:var(--muted); font-weight:600; margin-top:4px; }
  .rr-badge { background:rgba(0,212,106,.12); color:var(--green); border:1px solid rgba(0,212,106,.25); padding:4px 10px; border-radius:8px; font-size:12px; font-weight:700; }
  
  /* Scoring buttons */
  .scoring-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; padding:0 16px; }
  .score-btn { height:72px; border-radius:16px; display:flex; align-items:center; justify-content:center; font-family:'Bebas Neue',cursive; font-size:28px; cursor:pointer; border:none; transition:.15s; }
  .score-btn:active { transform:scale(.93); }
  .score-btn-0 { background:var(--card2); color:var(--muted); }
  .score-btn-1 { background:linear-gradient(135deg,#1a2a1a,#1e3a20); color:var(--green); border:1px solid rgba(0,212,106,.2); }
  .score-btn-2 { background:linear-gradient(135deg,#1a2a1a,#1e3a20); color:var(--green); border:1px solid rgba(0,212,106,.2); }
  .score-btn-3 { background:linear-gradient(135deg,#1a2a1a,#1e3a20); color:var(--green); border:1px solid rgba(0,212,106,.2); }
  .score-btn-4 { background:linear-gradient(135deg,#1f2800,#2a3500); color:var(--amber); border:1px solid rgba(255,184,0,.2); font-size:32px; }
  .score-btn-6 { background:linear-gradient(135deg,#2a1800,#3a2000); color:#FF6B00; border:1px solid rgba(255,107,0,.2); font-size:36px; }
  .score-btn-W { background:linear-gradient(135deg,#2a0a10,#3a0a15); color:var(--red); border:1px solid rgba(255,71,87,.3); }
  .score-btn-wide { background:var(--card2); color:var(--teal); font-size:14px; font-family:'Inter',sans-serif; font-weight:700; }
  .score-btn-nb { background:var(--card2); color:#FF9F43; font-size:13px; font-family:'Inter',sans-serif; font-weight:700; }
  .score-btn-bye { background:var(--card2); color:var(--muted); font-size:13px; font-family:'Inter',sans-serif; font-weight:700; }
  .score-btn-lb { background:var(--card2); color:var(--muted); font-size:12px; font-family:'Inter',sans-serif; font-weight:700; }

  /* Ball tracker */
  .ball-row { display:flex; gap:6px; flex-wrap:wrap; padding:0 16px; }
  .ball-chip { width:34px; height:34px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:700; flex-shrink:0; }
  .bc-0 { background:#243050; color:var(--muted); }
  .bc-1,.bc-2,.bc-3 { background:rgba(0,212,106,.15); color:var(--green); }
  .bc-4 { background:rgba(255,184,0,.2); color:var(--amber); }
  .bc-6 { background:rgba(255,107,0,.2); color:#FF6B00; }
  .bc-W { background:rgba(255,71,87,.2); color:var(--red); }
  .bc-Wd { background:rgba(0,188,212,.15); color:var(--teal); font-size:11px; }
  .bc-NB { background:rgba(255,159,67,.15); color:#FF9F43; font-size:10px; }

  /* Batsmen/Bowler strip */
  .player-strip { padding:0 16px; display:flex; flex-direction:column; gap:8px; }
  .ps-card { background:var(--card); border:1px solid var(--border); border-radius:12px; padding:10px 14px; display:flex; justify-content:space-between; align-items:center; }
  .ps-name { font-weight:700; font-size:14px; }
  .ps-stats { font-size:12px; color:var(--muted); }
  .ps-on-strike { background:rgba(0,212,106,.07); border-color:rgba(0,212,106,.25); }

  /* Match result */
  .result-hero { background:linear-gradient(135deg,#0d2a1a,#0a1f2a); border:2px solid var(--green); border-radius:20px; padding:24px; margin:12px 16px; text-align:center; }

  /* Tags */
  .tag { display:inline-flex; align-items:center; gap:5px; padding:4px 10px; border-radius:8px; font-size:12px; font-weight:600; }
  .tag-green { background:rgba(0,212,106,.15); color:var(--green); }
  .tag-red { background:rgba(255,71,87,.15); color:var(--red); }
  .tag-amber { background:rgba(255,184,0,.15); color:var(--amber); }
  .tag-blue { background:rgba(83,82,237,.2); color:#7B7AFF; }
  .tag-muted { background:var(--card2); color:var(--muted); }

  /* Forms */
  .input { background:var(--card2); border:1px solid var(--border); border-radius:12px; padding:12px 14px; color:var(--text); font-size:15px; font-family:'Inter',sans-serif; width:100%; outline:none; transition:.2s; }
  .input:focus { border-color:var(--green); box-shadow:0 0 0 3px rgba(0,212,106,.1); }
  .label { font-size:13px; color:var(--muted); font-weight:600; margin-bottom:6px; display:block; }
  .form-group { margin-bottom:16px; }
  
  /* Toggle / Select chips */
  .chip-row { display:flex; gap:8px; flex-wrap:wrap; }
  .chip { padding:8px 16px; border-radius:10px; background:var(--card2); border:1px solid var(--border); color:var(--muted); font-size:13px; font-weight:600; cursor:pointer; transition:.15s; }
  .chip.selected { background:rgba(0,212,106,.15); border-color:rgba(0,212,106,.4); color:var(--green); }
  
  /* Points table */
  .pts-table { width:100%; border-collapse:collapse; font-size:13px; }
  .pts-table th { color:var(--muted); font-weight:600; padding:8px 10px; text-align:left; border-bottom:1px solid var(--border); font-size:11px; letter-spacing:.5px; }
  .pts-table td { padding:10px 10px; border-bottom:1px solid rgba(36,48,80,.5); font-weight:600; }
  .pts-table tr:last-child td { border-bottom:none; }

  /* Modal */
  .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,.75); z-index:200; display:flex; align-items:flex-end; justify-content:center; }
  .modal { background:var(--card); border-radius:24px 24px 0 0; padding:24px; width:100%; max-width:480px; max-height:90vh; overflow-y:auto; animation:slideUp .25s ease; }
  @keyframes slideUp { from { transform:translateY(40px); opacity:0; } to { transform:none; opacity:1; } }
  .modal-handle { width:40px; height:4px; background:var(--border); border-radius:2px; margin:0 auto 20px; }
  
  /* Toast */
  .toast { position:fixed; top:20px; left:50%; transform:translateX(-50%); background:#1e3a20; border:1px solid rgba(0,212,106,.3); color:var(--green); padding:12px 20px; border-radius:12px; font-weight:600; font-size:14px; z-index:300; animation:toastIn .3s ease; white-space:nowrap; }
  @keyframes toastIn { from { opacity:0; transform:translateX(-50%) translateY(-10px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }

  /* Misc */
  .divider { height:1px; background:var(--border); margin:16px 0; }
  .section-label { font-size:11px; color:var(--muted); font-weight:700; letter-spacing:1.2px; text-transform:uppercase; padding:0 16px; margin-bottom:10px; }
  .empty-state { text-align:center; padding:48px 24px; color:var(--muted); }
  .empty-state svg { opacity:.3; margin-bottom:12px; }
  .flex-between { display:flex; justify-content:space-between; align-items:center; }
  .flex-center { display:flex; align-items:center; gap:8px; }
  .px16 { padding:0 16px; }
  .color-indicator { width:4px; height:44px; border-radius:2px; flex-shrink:0; }
  .live-dot { width:8px; height:8px; border-radius:50%; background:var(--red); animation:pulse 1s infinite; }
  @keyframes pulse { 0%,100%{opacity:1;} 50%{opacity:.4;} }
  .input option { background:var(--card); }
  .innings-tab { flex:1; padding:10px; text-align:center; font-weight:700; font-size:13px; cursor:pointer; border:none; background:none; color:var(--muted); border-bottom:2px solid transparent; font-family:'Inter',sans-serif; }
  .innings-tab.active { color:var(--green); border-bottom-color:var(--green); }
  .stat-row { display:flex; gap:6px; justify-content:space-between; }
  .stat-box { flex:1; background:var(--card2); border-radius:10px; padding:10px; text-align:center; }
  .stat-val { font-family:'Bebas Neue',cursive; font-size:26px; color:var(--text); }
  .stat-lbl { font-size:10px; color:var(--muted); font-weight:600; letter-spacing:.5px; }
  .over-section-label { font-size:11px; color:var(--muted); background:var(--card2); padding:2px 8px; border-radius:6px; font-weight:600; }
`;

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function GullyScore() {
  const [teams, setTeams]         = useState(() => LS.load("gs_teams", SEED.teams));
  const [history, setHistory]     = useState(() => LS.load("gs_history", SEED.history));
  const [tournaments, setTournaments] = useState(() => LS.load("gs_tournaments", SEED.tournaments));
  const [liveMatch, setLiveMatch] = useState(() => LS.load("gs_live", null));
  const [tab, setTab]             = useState("home");
  const [toast, setToast]         = useState(null);
  const [subpage, setSubpage]     = useState(null);  // { type, data }
  const toastRef = useRef(null);

  // Persist
  useEffect(() => { LS.save("gs_teams", teams); }, [teams]);
  useEffect(() => { LS.save("gs_history", history); }, [history]);
  useEffect(() => { LS.save("gs_tournaments", tournaments); }, [tournaments]);
  useEffect(() => { LS.save("gs_live", liveMatch); }, [liveMatch]);

  const showToast = useCallback((msg) => {
    setToast(msg);
    clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast(null), 2200);
  }, []);

  const getTeam = (id) => teams.find(t => t.id === id);

  // ─── BACKGROUND AUTO-SAVE CORE CONTROLLER ─────────────────────────────────
  const finishMatch = useCallback((forcedMatchState = null, shouldNavigate = true) => {
    const matchToSave = forcedMatchState || liveMatch;
    if (!matchToSave) return;

    setHistory(currentHistory => {
      const isAlreadySaved = currentHistory.some(m => m.id === matchToSave.id);
      if (!isAlreadySaved) {
        if (matchToSave.tournamentId) {
          setTournaments(prevTournaments => prevTournaments.map(t => {
            if (t.id !== matchToSave.tournamentId) return t;
            return {
              ...t,
              matches: t.matches.map(m => {
                if (m.id !== matchToSave.tournamentMatchId) return m;
                const i1 = matchToSave.innings[0];
                const i2 = matchToSave.innings[1];
                return {
                  ...m,
                  result: matchToSave.winner,
                  winMargin: matchToSave.winMargin,
                  t1Runs: i1.runs, t1Balls: i1.balls, t1Wickets: i1.wickets,
                  t2Runs: i2.runs, t2Balls: i2.balls, t2Wickets: i2.wickets,
                  matchData: matchToSave
                };
              })
            };
          }));
        }
        return [matchToSave, ...currentHistory];
      }
      return currentHistory;
    });

    // 🌟 THE UI PRESERVATION SEPARATOR GUARD
    if (shouldNavigate) {
      setLiveMatch(null);
      setTab("history");
      showToast("Viewing saved match ledger! 🎉");
    } else {
      showToast("Match progress auto-saved in background! 💾");
    }
  }, [liveMatch, showToast]);

  // ── Scoring engine ──────────────────────────────────────────────────────────
  const applyBall = useCallback((ball) => {
    setLiveMatch(prev => {
      if (!prev) return prev;
      const m = JSON.parse(JSON.stringify(prev));
      const inn = m.innings[m.currentInnings];
      
      const isWide = ball.type === "wide";
      const isNoBall = ball.type === "no_ball";
      const isWicket = ball.type === "wicket" || ball.wicketType === "Run Out";
      const isBye = ball.type === "bye";
      const isLegBye = ball.type === "leg_bye";
      const isRunOut = ball.wicketType === "Run Out";
      const isRetiredHurt = isWicket && ball.wicketType === "Retired";

      // 1. Track exact crease roles before any mutations
      if (!inn.historyStrikerIdx) inn.historyStrikerIdx = [];
      if (!inn.historyNonStrikerIdx) inn.historyNonStrikerIdx = [];
      if (!inn.historyBowlerIdx) inn.historyBowlerIdx = [];
      
      inn.historyStrikerIdx.push(inn.strikerIdx);
      inn.historyNonStrikerIdx.push(inn.nonStrikerIdx);
      inn.historyBowlerIdx.push(inn.currentBowlerIdx);

      const entry = { ...ball, overNum: Math.floor(inn.balls / 6), ballNum: inn.balls % 6 };
      inn.ballHistory.push(entry);

      const isLegalDelivery = !isWide && !isNoBall && !isRetiredHurt;

      // 2. Process Team Runs and Extras securely
      let deliveryRuns = ball.runs || 0;
      if (isWide) {
        inn.runs += 1 + deliveryRuns;
        inn.extras.wide += 1 + deliveryRuns;
      } else if (isNoBall) {
        inn.runs += 1 + deliveryRuns;
        inn.extras.noBall += 1 + deliveryRuns;
      } else {
        inn.runs += deliveryRuns;
        if (isBye) inn.extras.bye += deliveryRuns;
        if (isLegBye) inn.extras.legBye += deliveryRuns;
      }

      // 3. Update Facing Batsman Personal Stats Profile
      if (!isRetiredHurt) {
        const batter = inn.batsmen[inn.strikerIdx];
        if (batter) {
          if (!isWicket && !isWide && !isBye && !isLegBye) {
            batter.runs += deliveryRuns;
          } else if (isRunOut && !isWide) {
            batter.runs += deliveryRuns;
          }
          
          if (!isWide) {
            batter.balls += 1;
          }
          if (!isWide && !isBye && !isLegBye && deliveryRuns === 4) batter.fours++;
          if (!isWide && !isBye && !isLegBye && deliveryRuns === 6) batter.sixes++;
        }
      }

      // 4. Handle Dismissal States vs Tactical Retired Hurt
      if (isWicket) {
        if (isRetiredHurt) {
          inn.batsmen[inn.strikerIdx].out = false;
          inn.batsmen[inn.strikerIdx].outDesc = "Retired Hurt";
        } else if (isRunOut) {
          const victimIdx = ball.dismissedPosition === "non_striker" ? inn.nonStrikerIdx : inn.strikerIdx;
          inn.wickets += 1;
          inn.batsmen[victimIdx].out = true;
          inn.batsmen[victimIdx].outDesc = "Run Out";
          
          inn.runOutVictimCreaseSlot = ball.dismissedPosition === "non_striker" ? "non_striker" : "striker";
          inn.runOutStrikeIntent = ball.nextFacingIntent;
        } else {
          inn.wickets += 1;
          inn.batsmen[inn.strikerIdx].out = true;
          inn.batsmen[inn.strikerIdx].outDesc = ball.wicketType || "out";
        }
        m.needNewBatsmen = true; 
      }

      // 5. Update Bowler Stats
      const bowler = inn.bowlers[inn.currentBowlerIdx];
      if (bowler) {
        if (isWide || isNoBall) {
          bowler.runs += 1 + deliveryRuns;
        } else if (!isBye && !isLegBye) {
          bowler.runs += deliveryRuns;
        }
        if (isWicket && !isRetiredHurt && ball.wicketType !== "Run Out") {
          bowler.wickets++;
        }
        if (isLegalDelivery) {
          bowler.balls += 1;
        }
      }

      // 6. Universal Strike Rotation Mechanics (Preserve indices on standard wickets)
      if (!isWicket && deliveryRuns % 2 !== 0) {
        [inn.strikerIdx, inn.nonStrikerIdx] = [inn.nonStrikerIdx, inn.strikerIdx];
      } else if (isRunOut) {
        // Run out handler updates indices based on final intentions
        if (ball.runs % 2 !== 0) {
          [inn.strikerIdx, inn.nonStrikerIdx] = [inn.nonStrikerIdx, inn.strikerIdx];
        }
      }

      // 7. Over Boundary Transitions
      if (isLegalDelivery && inn.balls + 1 <= m.overs * 6) {
        if ((inn.balls + 1) % 6 === 0) {
          if (!isWicket) {
            [inn.strikerIdx, inn.nonStrikerIdx] = [inn.nonStrikerIdx, inn.strikerIdx];
          }
          m.needNewBowler = true;
        }
      }

      if (isLegalDelivery) {
        inn.balls += 1;
      }

      // 8. Innings Verification & Victory State Machine
      if (m.winner === "abrupt") {
        return m;
      }

      const maxBalls = m.overs * 6;
      const allOut = inn.wickets >= (inn.batsmen.length - 1);
      const oversUp = inn.balls >= maxBalls;
      const targetChasedDown = m.currentInnings === 1 && inn.target !== null && inn.runs >= inn.target;

      if (targetChasedDown) {
        m.needsConfirmation = true; 
        m.winner = m.team2;
        m.winMargin = `${(inn.batsmen.length - 1) - inn.wickets} wickets`;
        return m;
      }

      if (allOut || oversUp) {
        if (m.currentInnings === 0) {
          m.needsConfirmation = true; 
          m.winner = "innings_break"; 
          m.freeHit = false; 
        } else {
          m.needsConfirmation = true; 
          const i1 = m.innings[0];
          const i2 = m.innings[1];
          if (i2.runs >= i1.runs + 1) {
            m.winner = m.team2;
            m.winMargin = `${(i2.batsmen.length - 1) - i2.wickets} wickets`;
          } else if (i2.runs === i1.runs) {
            m.winner = "tie";
            m.winMargin = "Match Tied";
          } else {
            m.winner = m.team1;
            m.winMargin = `${i1.runs - i2.runs} runs`;
          }
        }
      }
      return m;
    });
  }, [finishMatch]);

  const undoLastBall = useCallback(() => {
    setLiveMatch(prev => {
      if (!prev) return prev;
      const m = JSON.parse(JSON.stringify(prev));
      const inn = m.innings[m.currentInnings];
      if (inn.ballHistory.length === 0) return prev;
      
      const last = inn.ballHistory.pop();
      const isWide = last.type === "wide";
      const isNoBall = last.type === "no_ball";
      const isWicket = last.type === "wicket" || last.wicketType === "Run Out";
      const isBye = last.type === "bye";
      const isLegBye = last.type === "leg_bye";
      const isRunOut = last.wicketType === "Run Out";
      const isRetiredHurt = isWicket && last.wicketType === "Retired";

      // 1. Revert team totals and extras configurations
      let deliveryRuns = last.runs || 0;
      if (isWide) {
        inn.runs -= 1 + deliveryRuns;
        inn.extras.wide = Math.max(0, inn.extras.wide - 1 - deliveryRuns);
      } else if (isNoBall) {
        inn.runs -= 1 + deliveryRuns;
        inn.extras.noBall = Math.max(0, inn.extras.noBall - 1 - deliveryRuns);
      } else {
        inn.runs -= deliveryRuns;
        if (isBye) inn.extras.bye = Math.max(0, inn.extras.bye - deliveryRuns);
        if (isLegBye) inn.extras.legBye = Math.max(0, inn.extras.legBye - deliveryRuns);
      }
      
      if (isWicket && !isRetiredHurt) inn.wickets = Math.max(0, inn.wickets - 1);
      if (!isWide && !isNoBall && !isRetiredHurt) inn.balls = Math.max(0, inn.balls - 1);

      m.needNewBowler = false;
      m.needNewBatsmen = false;

      // 2. Pull who faced the ball from history arrays
      if (inn.historyStrikerIdx && inn.historyStrikerIdx.length > 0) {
        const prevStriker = inn.historyStrikerIdx.pop();
        
        if (isWicket) {
          const victimIdx = (isRunOut && last.dismissedPosition === "non_striker") ? (inn.historyNonStrikerIdx[inn.historyNonStrikerIdx.length - 1]) : prevStriker;
          if (inn.batsmen[victimIdx]) {
            inn.batsmen[victimIdx].out = false;
            inn.batsmen[victimIdx].outDesc = "";
          }
        }

        if (inn.batsmen[prevStriker] && !isRetiredHurt) {
          if (!isWicket && !isWide && !isBye && !isLegBye) {
            inn.batsmen[prevStriker].runs = Math.max(0, inn.batsmen[prevStriker].runs - deliveryRuns);
          } else if (isRunOut && !isWide) {
            inn.batsmen[prevStriker].runs = Math.max(0, inn.batsmen[prevStriker].runs - deliveryRuns);
          }
          
          if (!isWide) {
            inn.batsmen[prevStriker].balls = Math.max(0, inn.batsmen[prevStriker].balls - 1);
          }
          if (!isWide && !isBye && !isLegBye && deliveryRuns === 4) inn.batsmen[prevStriker].fours = Math.max(0, inn.batsmen[prevStriker].fours - 1);
          if (!isWide && !isBye && !isLegBye && deliveryRuns === 6) inn.batsmen[prevStriker].sixes = Math.max(0, inn.batsmen[prevStriker].sixes - 1);
        }

        if (isWicket && !isRetiredHurt) {
          inn.nextBatsmanIdx = Math.max(0, inn.nextBatsmanIdx - 1);
        }

        inn.strikerIdx = prevStriker;
      }
      
      if (inn.historyNonStrikerIdx && inn.historyNonStrikerIdx.length > 0) {
        inn.nonStrikerIdx = inn.historyNonStrikerIdx.pop();
      }
      
      if (inn.historyBowlerIdx && inn.historyBowlerIdx.length > 0) {
        const prevBowler = inn.historyBowlerIdx.pop();
        if (inn.bowlers[prevBowler]) {
          if (isWide || isNoBall) {
            inn.bowlers[prevBowler].runs = Math.max(0, inn.bowlers[prevBowler].runs - (deliveryRuns + 1));
          } else if (!isBye && !isLegBye) {
            inn.bowlers[prevBowler].runs = Math.max(0, inn.bowlers[prevBowler].runs - deliveryRuns);
          }
          if (isWicket && !isRetiredHurt && last.wicketType !== "Run Out") {
            inn.bowlers[prevBowler].wickets = Math.max(0, inn.bowlers[prevBowler].wickets - 1);
          }
          if (!isWide && !isNoBall && !isRetiredHurt) {
            inn.bowlers[prevBowler].balls = Math.max(0, inn.bowlers[prevBowler].balls - 1);
          }
        }
        inn.currentBowlerIdx = prevBowler;
      }

      inn.runOutVictimCreaseSlot = null;
      inn.runOutStrikeIntent = null;

      return m;
    });
    showToast("Last ball undone");
  }, [showToast]);

  const startMatch = useCallback((config) => {
    const t1 = getTeam(config.team1);
    const t2 = getTeam(config.team2);
    
    const firstBatId = config.battingFirst === "team2" ? config.team2 : config.team1;
    const secondBatId = config.battingFirst === "team2" ? config.team1 : config.team2;
    
    const batTeamObj = getTeam(firstBatId);
    const bowlTeamObj = getTeam(secondBatId);

    const mkBatsmen = (t) => t.players.map(p => ({ name:p, runs:0, balls:0, fours:0, sixes:0, out:false, outDesc:"" }));
    const mkBowlers = (t) => t.players.map(p => ({ name:p, balls:0, runs:0, wickets:0 }));
    
    const match = {
      id: generateId(), date: now(), overs: config.overs,
      team1: firstBatId, team2: secondBatId, 
      currentInnings: 0, completed: false,
      winner: null, winMargin: null,
      needNewBatsmen: true, 
      needNewBowler: true,  
      innings: [
        { team: firstBatId, runs:0, wickets:0, balls:0, extras:{wide:0,noBall:0,bye:0,legBye:0},
          batsmen: mkBatsmen(batTeamObj), bowlers: mkBowlers(bowlTeamObj),
          strikerIdx: -1,      
          nonStrikerIdx: -1,   
          nextBatsmanIdx: 0,    
          currentBowlerIdx: 0,
          ballHistory:[], target:null, historyStrikerIdx:[], historyNonStrikerIdx:[], historyBowlerIdx:[] },
        { team: secondBatId, runs:0, wickets:0, balls:0, extras:{wide:0,noBall:0,bye:0,legBye:0},
          batsmen: mkBatsmen(bowlTeamObj), bowlers: mkBowlers(batTeamObj),
          strikerIdx: -1, 
          nonStrikerIdx: -1, 
          nextBatsmanIdx: 0, 
          currentBowlerIdx: 0,
          ballHistory:[], target:null, historyStrikerIdx:[], historyNonStrikerIdx:[], historyBowlerIdx:[] },
      ]
    };
    setLiveMatch(match);
    setTab("match");
    setSubpage(null);
    showToast("Match started! 🏏");
  }, [teams, showToast]);

  // ── Render ──────────────────────────────────────────────────────────────────
  const renderPage = () => {
    if (subpage) {
      switch (subpage.type) {
        case "new_match": return <NewMatchPage teams={teams} onStart={startMatch} onBack={() => setSubpage(null)} />;
        case "scorecard": return <ScorecardPage match={subpage.data} teams={teams} onBack={() => setSubpage(null)} />;
        case "new_team": return <NewTeamPage onSave={(t) => { setTeams(ts => [...ts, t]); setSubpage(null); showToast("Team created! 🎉"); }} onBack={() => setSubpage(null)} />;
        case "edit_team": return (<EditTeamPage team={subpage.data} onSave={(t) => { setTeams(ts => ts.map(x => x.id === t.id ? t : x)); setSubpage(null); showToast("Team updated!"); }} onBack={() => setSubpage(null)} onDelete={(id) => { setTeams(ts => ts.filter(t => t.id !== id)); setSubpage(null); showToast("Team deleted"); }} />);
        case "new_tournament": return <NewTournamentPage teams={teams} onSave={(t) => { setTournaments(ts => [t, ...ts]); setSubpage(null); showToast("Tournament created! 🏆"); }} onBack={() => setSubpage(null)} />;
        case "tournament": return <TournamentPage tournament={subpage.data} teams={teams} onBack={() => setSubpage(null)} onUpdate={(t) => setTournaments(ts => ts.map(x => x.id === t.id ? t : x))} />;
      }
    }
    switch (tab) {
      case "home":    return <HomePage liveMatch={liveMatch} history={history} tournaments={tournaments} teams={teams} onGoLive={() => setTab("match")} onNewMatch={() => setSubpage({type:"new_match"})} onViewMatch={(m) => setSubpage({type:"scorecard",data:m})} onViewTournament={(t) => setSubpage({type:"tournament",data:t})} getTeam={getTeam} />;
      case "match":   return <MatchPage liveMatch={liveMatch} teams={teams} getTeam={getTeam} applyBall={applyBall} undoLastBall={undoLastBall} onFinish={finishMatch} onNewMatch={() => setSubpage({type:"new_match"})} setLiveMatch={setLiveMatch} showToast={showToast} />;
      case "teams":   return <TeamsPage teams={teams} onNew={() => setSubpage({type:"new_team"})} onEdit={(t) => setSubpage({type:"edit_team",data:t})} history={history} />;
      case "history": return <HistoryPage history={history} teams={teams} onView={(m) => setSubpage({type:"scorecard",data:m})} getTeam={getTeam} />;
      case "tournament": return <TournamentsPage tournaments={tournaments} teams={teams} onNew={() => setSubpage({type:"new_tournament"})} onView={(t) => setSubpage({type:"tournament",data:t})} getTeam={getTeam} />;
    }
  };

  const NAV = [
    { id:"home", label:"Home", icon:<Icon.Home/> },
    { id:"match", label:"Score", icon:<Icon.Cricket/> },
    { id:"teams", label:"Teams", icon:<Icon.Teams/> },
    { id:"history", label:"History", icon:<Icon.History/> },
    { id:"tournament", label:"League", icon:<Icon.Trophy/> },
  ];

  return (
    <>
      <style>{STYLES}</style>
      <div className="app">
        {renderPage()}
        {!subpage && (
          <nav className="bottom-nav">
            {NAV.map(n => (
              <button key={n.id} className={`nav-btn ${tab===n.id?"active":""}`} onClick={() => setTab(n.id)}>
                {n.icon} {n.label}
              </button>
            ))}
          </nav>
        )}
        {toast && <div className="toast">{toast}</div>}
      </div>
    </>
  );
}

// ─── Home Page ────────────────────────────────────────────────────────────────
function HomePage({ liveMatch, history, tournaments, teams, onGoLive, onNewMatch, onViewMatch, onViewTournament, getTeam }) {
  return (
    <div className="page">
      <div style={{padding:"24px 16px 8px", display:"flex", justifyContent:"space-between", alignItems:"center"}}>
        <div>
          <div style={{display:"flex", alignItems:"center", gap:8, marginBottom:2}}>
            <div style={{width:32, height:32, background:"linear-gradient(135deg,#00D46A,#00A854)", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18}}>📦</div>
            <span style={{fontFamily:"Bebas Neue", fontSize:28, letterSpacing:2, color:"var(--text)"}}>BOX <span style={{color:"var(--green)"}}>CRICKET</span></span>
          </div>
          <div style={{fontSize:12, color:"var(--muted)", paddingLeft:40}}>Indoor & turf rules, pro tracking</div>
        </div>
      </div>

      {liveMatch && !liveMatch.completed && (
        <div style={{margin:"12px 16px", background:"linear-gradient(135deg,#0d2a1a,#0a1e28)", border:"1px solid rgba(0,212,106,.3)", borderRadius:16, padding:16, cursor:"pointer"}} onClick={onGoLive}>
          <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12}}>
            <div style={{display:"flex", alignItems:"center", gap:8}}>
              <div className="live-dot" /><span style={{fontWeight:700, fontSize:14, color:"var(--green)"}}>LIVE MATCH</span>
            </div>
            <span style={{fontSize:12, color:"var(--muted)"}}>Tap to score →</span>
          </div>
          <LiveMatchMini match={liveMatch} getTeam={getTeam} />
        </div>
      )}

      <div style={{padding:"8px 16px", display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:4}}>
        <button className="btn btn-primary" style={{display:"flex", alignItems:"center", justifyContent:"center", gap:8, borderRadius:14}} onClick={onNewMatch}>
          <Icon.Plus /> New Match
        </button>
        <button className="btn btn-secondary btn" style={{display:"flex", alignItems:"center", justifyContent:"center", gap:8, borderRadius:14, padding:"14px 16px"}} onClick={onGoLive}>
          <Icon.Cricket /> Scoreboard
        </button>
      </div>

      <div style={{padding:"8px 16px", display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:8}}>
        {[["Matches",history.length],["Teams",teams.length],["Leagues",tournaments.length]].map(([l,v]) => (
          <div key={l} className="card" style={{padding:"12px 10px", textAlign:"center", margin:0}}>
            <div style={{fontFamily:"Bebas Neue", fontSize:28, color:"var(--green)"}}>{v}</div>
            <div style={{fontSize:11, color:"var(--muted)", fontWeight:600}}>{l}</div>
          </div>
        ))}
      </div>

      {tournaments.filter(t => t.status === "ongoing").length > 0 && (
        <>
          <div className="section-label" style={{marginTop:12}}>🏆 Active Leagues</div>
          <div className="px16">
            {tournaments.filter(t => t.status==="ongoing").slice(0,2).map(t => (
              <TournamentCard key={t.id} t={t} teams={teams} onClick={() => onViewTournament(t)} />
            ))}
          </div>
        </>
      )}

      <div className="section-label" style={{marginTop:12}}>🎯 Recent Matches</div>
      <div className="px16">
        {history.length === 0 && <div className="empty-state"><div style={{fontSize:32}}>🏏</div><div style={{marginTop:8}}>No matches yet</div></div>}
        {history.slice(0,5).map(m => (
          <MatchCard key={m.id} match={m} getTeam={getTeam} onClick={() => onViewMatch(m)} />
        ))}
      </div>
      <div style={{height:8}} />
    </div>
  );
}

function LiveMatchMini({ match, getTeam }) {
  const inn = match.innings[match.currentInnings];
  const t = getTeam(inn.team);
  return (
    <div>
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-end"}}>
        <div>
          <div style={{fontSize:13, color:"var(--muted)", marginBottom:2}}>{t?.name || "Batting"}</div>
          <div style={{display:"flex", alignItems:"baseline", gap:6}}>
            <span style={{fontFamily:"Bebas Neue", fontSize:42, color:"var(--text)"}}>{inn.runs}/{inn.wickets}</span>
            <span style={{fontSize:14, color:"var(--muted)"}}>{fmtOvers(inn.balls)} ov</span>
          </div>
        </div>
        <div style={{textAlign:"right"}}>
          {match.currentInnings === 1 && inn.target && (
            <div style={{fontSize:12, color:"var(--amber)", fontWeight:700}}>Need {inn.target - inn.runs} off {match.overs*6 - inn.balls} balls</div>
          )}
          <div className="rr-badge" style={{marginTop:4}}>RR {calcRR(inn.runs, inn.balls)}</div>
        </div>
      </div>
      <div style={{display:"flex", gap:5, marginTop:10}}>
        {inn.ballHistory.slice(-6).map((b,i) => {
          const label = b.type==="wicket"?"W": b.type==="wide"?"Wd": b.type==="no_ball"?"NB": b.runs||"0";
          const cls = b.type==="wicket"?"bc-W": b.type==="wide"?"bc-Wd": b.type==="no_ball"?"bc-NB": `bc-${b.runs||0}`;
          return <div key={i} className={`ball-chip ${cls}`} style={{width:28,height:28,fontSize:11}}>{label}</div>;
        })}
      </div>
    </div>
  );
}

// ─── Match Page ───────────────────────────────────────────────────────────────
function MatchPage({ liveMatch, teams, getTeam, applyBall, undoLastBall, onFinish, onNewMatch, setLiveMatch, showToast }) {
  const [bowlerModal, setBowlerModal] = useState(false);
  const [batsmanModal, setBatsmanModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [scorecardTab, setScorecardTab] = useState(null); 
  const [scoringPipeline, setScoringPipeline] = useState(null); 
  const [pendingFielder, setPendingFielder] = useState("");

  // Stepped Opener Menu Interceptor Hook
  useEffect(() => {
    if (!liveMatch) return;
    const currentInn = liveMatch.innings[liveMatch.currentInnings];

    if (liveMatch.needsConfirmation) {
      setBatsmanModal(false); setBowlerModal(false);
      return;
    }

    if (scoringPipeline !== null) {
      setBatsmanModal(false); setBowlerModal(false);
      return;
    }

    if (currentInn.strikerIdx === -1 || currentInn.nonStrikerIdx === -1) {
      setBatsmanModal(true); setBowlerModal(false);
      return;
    }

    if (liveMatch.needNewBatsmen) {
      setBatsmanModal(true); setBowlerModal(false);
      return;
    }

    if (liveMatch.needNewBowler) {
      setBowlerModal(true); setBatsmanModal(false);
      return;
    }

    setBatsmanModal(false); setBowlerModal(false);
  }, [
    liveMatch?.needNewBowler, liveMatch?.needNewBatsmen, liveMatch?.needsConfirmation,
    liveMatch?.currentInnings, scoringPipeline,
    liveMatch?.innings?.[liveMatch?.currentInnings]?.strikerIdx, 
    liveMatch?.innings?.[liveMatch?.currentInnings]?.nonStrikerIdx
  ]);

  if (!liveMatch) {
    return (
      <div className="page">
        <div style={{padding:"24px 16px 12px", display:"flex", alignItems:"center", gap:12}}>
          <span style={{fontFamily:"Bebas Neue", fontSize:24, letterSpacing:1}}>SCOREBOARD</span>
        </div>
        <div className="empty-state" style={{paddingTop:80}}>
          <div style={{fontSize:48, marginBottom:16}}>🏏</div>
          <div style={{fontSize:18, fontWeight:700, marginBottom:8, color:"var(--text)"}}>No Active Match</div>
          <div style={{marginBottom:24, fontSize:14}}>Start a new match to begin scoring</div>
          <button className="btn btn-primary" style={{maxWidth:200, margin:"0 auto"}} onClick={onNewMatch}>Start New Match</button>
        </div>
      </div>
    );
  }

  if (liveMatch.completed) return <MatchResultPage match={liveMatch} getTeam={getTeam} onSave={onFinish} onNew={onNewMatch} />;

  const inn = liveMatch.innings[liveMatch.currentInnings];
  const striker = inn.strikerIdx !== -1 ? inn.batsmen[inn.strikerIdx] : { name: "Select Striker", runs: 0, balls: 0, fours: 0, sixes: 0 };
  const nonStriker = inn.nonStrikerIdx !== -1 ? inn.batsmen[inn.nonStrikerIdx] : { name: "Select Non-Striker", runs: 0, balls: 0, fours: 0, sixes: 0 };
  const bowler = inn.bowlers[inn.currentBowlerIdx];
  const t1 = getTeam(liveMatch.team1);
  const t2 = getTeam(liveMatch.team2);
  const battingTeam = getTeam(inn.team);
  const bowlingTeam = inn.team === liveMatch.team1 ? t2 : t1;
  const maxBalls = liveMatch.overs * 6;
  const needRuns = liveMatch.currentInnings === 1 && inn.target ? inn.target - inn.runs : null;
  const needBalls = maxBalls - inn.balls;

  const selectBowler = (idx) => {
    setLiveMatch(m => {
      const nm = JSON.parse(JSON.stringify(m));
      const inn = nm.innings[nm.currentInnings];
      inn.currentBowlerIdx = idx;
      nm.needNewBowler = false;

      if (inn.balls > 0 && inn.balls % 6 === 0 && inn.ballHistory.length > 0) {
        const lastBall = inn.ballHistory[inn.ballHistory.length - 1];
        if (lastBall.type === "wicket" && lastBall.wicketType !== "Retired") {
          [inn.strikerIdx, inn.nonStrikerIdx] = [inn.nonStrikerIdx, inn.strikerIdx];
          showToast("Over complete! Ends change — surviving batsman takes strike. 🔄");
        }
      }
      return nm;
    });
    setBowlerModal(false);
  };

  const selectBatsman = (idx) => {
    setLiveMatch(m => {
      const nm = JSON.parse(JSON.stringify(m));
      const currentInn = nm.innings[nm.currentInnings];

      if (currentInn.strikerIdx === -1) {
        currentInn.strikerIdx = idx;
        nm.needNewBatsmen = true; 
        showToast("Striker set! Now select Non-Striker 🏃");
        return nm;
      }

      if (currentInn.nonStrikerIdx === -1) {
        if (idx === currentInn.strikerIdx) {
          alert("Gully Rules Error: Same player cannot open from both ends!");
          return m;
        }
        currentInn.nonStrikerIdx = idx;
        const maxSelectedIdx = Math.max(currentInn.strikerIdx, currentInn.nonStrikerIdx);
        currentInn.nextBatsmanIdx = maxSelectedIdx + 1;
        nm.needNewBatsmen = false; 
        showToast("Openers ready! Play ball 🏏");
        return nm;
      }

      const strikerIsOut = currentInn.batsmen[currentInn.strikerIdx]?.out;
      const nonStrikerIsOut = currentInn.batsmen[currentInn.nonStrikerIdx]?.out;

      if (strikerIsOut) {
        currentInn.strikerIdx = idx;
      } else if (nonStrikerIsOut) {
        currentInn.nonStrikerIdx = idx;
      } else {
        currentInn.strikerIdx = idx;
      }
      
      const highestActiveIdx = Math.max(currentInn.strikerIdx, currentInn.nonStrikerIdx);
      if (idx >= currentInn.nextBatsmanIdx) {
        currentInn.nextBatsmanIdx = highestActiveIdx + 1;
      }
      
      nm.needNewBatsmen = false;
      showToast("New batsman has taken guard!");
      return nm;
    });
  };

  return (
    <div className="page">
      {/* Header */}
      <div style={{padding:"16px 16px 8px", display:"flex", justifyContent:"space-between", alignItems:"center"}}>
        <div style={{display:"flex", alignItems:"center", gap:8}}>
          <div className="live-dot" />
          <span style={{fontWeight:700, fontSize:14, color:"var(--text)"}}>{battingTeam?.name}</span>
          <span style={{fontSize:12, color:"var(--muted)"}}>vs {bowlingTeam?.name}</span>
        </div>
        <div style={{display:"flex", gap:8}}>
          <button className="btn btn-ghost" style={{padding:"6px 10px"}} onClick={undoLastBall}><Icon.Undo /></button>
          <button className="btn btn-ghost" style={{padding:"6px 10px"}} onClick={() => setScorecardTab(scorecardTab?null:"card")}>
            {scorecardTab ? <Icon.Cricket /> : "📋"}
          </button>
        </div>
      </div>

      {scorecardTab === "card" ? (
        <InlineScorecardView match={liveMatch} getTeam={getTeam} />
      ) : (
        <>
          {/* Score Hero */}
          <div className="score-hero">
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start"}}>
              <div>
                <div style={{fontSize:12, color:"var(--muted)", marginBottom:4, fontWeight:600}}>
                  {liveMatch.currentInnings === 0 ? "1st Innings" : "2nd Innings"}
                  {liveMatch.currentInnings === 1 && ` · Target: ${inn.target}`}
                </div>
                <div style={{display:"flex", alignItems:"baseline", gap:4}}>
                  <span className="score-runs">{inn.runs}</span>
                  <span className="score-wkts">/{inn.wickets}</span>
                </div>
                <div className="score-overs">{fmtOvers(inn.balls)} / {liveMatch.overs} overs</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div className="rr-badge">RR {calcRR(inn.runs, inn.balls)}</div>
                {needRuns !== null && (
                  <div style={{marginTop:8, fontSize:12, color: needRuns <= 12 ? "var(--green)" : "var(--amber)", fontWeight:700}}>
                    Need {needRuns} off {needBalls}b
                  </div>
                )}
                <div style={{marginTop:8, fontSize:12, color:"var(--muted)"}}>
                  Extras: {Object.values(inn.extras).reduce((a,b)=>a+b,0)}
                </div>
              </div>
            </div>
            
            <div style={{marginTop:14, display:"flex", alignItems:"center", gap:8, flexWrap:"wrap"}}>
              <span className="over-section-label">Over {Math.floor(inn.balls/6)+1}</span>
              <div style={{display:"flex", gap:5, flexWrap:"wrap"}}>
                {inn.ballHistory.filter(b => b.overNum === Math.floor(inn.balls/6)).map((b,i) => {
                  const label = b.type==="wicket"?"W": b.type==="wide"?"Wd": b.type==="no_ball"?"NB": b.runs||"0";
                  const cls = b.type==="wicket"?"bc-W": b.type==="wide"?"bc-Wd": b.type==="no_ball"?"bc-NB": `bc-${b.runs||0}`;
                  return <div key={i} className={`ball-chip ${cls}`}>{label}</div>;
                })}
              </div>
            </div>
          </div>

          {/* Crease strip */}
          <div className="player-strip" style={{marginBottom:10}}>
            {[inn.batsmen[inn.strikerIdx], inn.batsmen[inn.nonStrikerIdx]].map((b, i) => b && (
              <div key={i} className={`ps-card ${i===0?"ps-on-strike":""}`}>
                <div>
                  <div className="flex-center">
                    {i === 0 && <span style={{color:"var(--green)", fontSize:14}}>●</span>}
                    <span className="ps-name">{b.name}</span>
                  </div>
                  <div className="ps-stats">SR: {b.balls > 0 ? ((b.runs/b.balls)*100).toFixed(0) : 0}</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <span style={{fontFamily:"Bebas Neue", fontSize:22}}>{b.runs}</span>
                  <span style={{color:"var(--muted)", fontSize:13}}> ({b.balls})</span>
                  <div className="ps-stats">{b.fours}×4  {b.sixes}×6</div>
                </div>
              </div>
            ))}
            {bowler && (
              <div className="ps-card" style={{background:"rgba(83,82,237,.07)", borderColor:"rgba(83,82,237,.2)"}}>
                <div>
                  <div className="flex-center"><span style={{color:"#7B7AFF", fontSize:14}}>⚡</span><span className="ps-name">{bowler.name}</span></div>
                  <div className="ps-stats">Bowling</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <span style={{color:"#7B7AFF", fontWeight:700}}>{fmtOvers(bowler.balls)}-{bowler.runs}-{bowler.wickets}</span>
                </div>
              </div>
            )}
          </div>

          {liveMatch.needsConfirmation ? (
            <div style={{
              margin: "16px", padding: "20px", background: "linear-gradient(135deg, #1e1e2f, #151522)", 
              border: "2px solid var(--amber)", borderRadius: "16px", textAlign: "center"
            }}>
              <div style={{fontSize: 24, marginBottom: 4}}>{liveMatch.winner === "innings_break" ? "" : "🏁"}</div>
              <div style={{fontSize: 18, fontWeight: 800, color: "var(--amber)", marginBottom: 4}}>
                {liveMatch.winner === "innings_break" ? "CONFIRM INNINGS SCORE" : "POTENTIAL MATCH COMPLETION"}
              </div>
              <p style={{fontSize: 13, color: "var(--muted)", marginBottom: 20}}>
                {liveMatch.winner === "innings_break" ? (
                  <><strong>{getTeam(inn.team)?.name}</strong> finished at <strong>{inn.runs}/{inn.wickets}</strong>. Target: <strong>{inn.runs + 1}</strong>. Is this correct?</>
                ) : (
                  <>According to the ledger, <strong>{liveMatch.winner === "tie" ? "The Match is a Tie" : `${getTeam(liveMatch.winner)?.name} has won`}</strong>. Is this correct?</>
                )}
              </p>
              
              <div style={{display: "flex", flexDirection: "column", gap: 10}}>
                <button className="btn btn-primary" style={{width: "100%", padding: "14px", fontWeight: 700, borderRadius: 12}}
                  onClick={() => {
                    setLiveMatch(m => {
                      const nm = JSON.parse(JSON.stringify(m));
                      nm.needsConfirmation = false;
                      if (nm.winner === "innings_break") {
                        nm.currentInnings = 1; nm.innings[1].target = nm.innings[0].runs + 1;
                        nm.needNewBatsmen = true; nm.needNewBowler = true; nm.winner = null;
                      } else { 
                        nm.completed = true;
                        setTimeout(() => { onFinish(nm, false); }, 0);
                       }
                      return nm;
                    });
                  }}
                >
                  {liveMatch.winner === "innings_break" ? "✅ Yes, Start 2nd Innings" : "✅ Yes, Confirm Result & Save"}
                </button>
                
                <button 
                  className="btn-ghost" 
                  style={{
                    width: "100%", padding: "12px", color: "var(--red)", 
                    border: "1px solid rgba(255,71,87,0.2)", borderRadius: 12, fontWeight: 600, cursor: "pointer"
                  }}
                  onClick={() => {
                    undoLastBall(); 
                    setLiveMatch(m => {
                      const nm = JSON.parse(JSON.stringify(m));
                      nm.needsConfirmation = false;
                      if (nm.winner === "innings_break") nm.winner = null;
                      return nm;
                    });
                  }}
                >
                  ❌ No, Undo Last Ball (Fix Mistake)
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Scoring action switches */}
              <div className="scoring-grid" style={{display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, padding:"0 16px"}}>
                {[0, 1, 2, 3].map(r => (
                  <button key={r} className="score-btn score-btn-runs" style={{height:52, fontSize:15, fontWeight:700, background:"#2a2a40"}} onClick={() => applyBall({ type: "runs", runs: r })}>
                    {r}
                  </button>
                ))}
                <button className="score-btn" style={{height:52, fontSize:15, fontWeight:800, background:"#00D46A", color:"#000"} } onClick={() => applyBall({ type: "runs", runs: 4 })}>4</button>
                <button className="score-btn" style={{height:52, fontSize:15, fontWeight:800, background:"#00A854", color:"#000"} } onClick={() => applyBall({ type: "runs", runs: 6 })}>6</button>
                
                <button className="score-btn" style={{height:52, fontSize:13, fontWeight:700, background:"#3b3b54"}} onClick={() => setScoringPipeline({ stage: "EXTRAS_RUNS", ballType: "wide" })}>WD</button>
                <button className="score-btn" style={{height:52, fontSize:13, fontWeight:700, background:"#3b3b54"}} onClick={() => setScoringPipeline({ stage: "EXTRAS_RUNS", ballType: "no_ball" })}>NB</button>
                <button className="score-btn" style={{height:52, fontSize:13, fontWeight:700, background:"#3b3b54"}} onClick={() => setScoringPipeline({ stage: "EXTRAS_RUNS", ballType: "bye" })}>BYE</button>
                <button className="score-btn" style={{height:52, fontSize:13, fontWeight:700, background:"#3b3b54"}} onClick={() => setScoringPipeline({ stage: "EXTRAS_RUNS", ballType: "leg_bye" })}>LB</button>
                
                <button className="score-btn" style={{height:52, gridColumn:"span 4", fontSize:14, fontWeight:800, background:"#ff4757", color:"#fff", letterSpacing:1}} onClick={() => setScoringPipeline({ stage: "WICKET_TYPE" })}>
                  🔴 WICKET (OUT)
                </button>
              </div>

              {/* Abrupt Manual End Auto-Save Integration Trigger */}
              <div style={{padding:"16px", display:"flex", gap:8}}>
                <button 
                  className="btn btn-danger btn" 
                  style={{flex:1}} 
                  onClick={() => { 
                    if(window.confirm("End match abruptly and save directly to history?")) {
                      setLiveMatch(m => {
                        const nm = JSON.parse(JSON.stringify(m));
                        nm.completed = true;
                        nm.winner = "abrupt";
                        nm.winMargin = "Match ended abruptly";
                        
                        // Push immediately to pipeline arrays and save instantly
                        setTimeout(() => { onFinish(nm); }, 0);
                        return nm;
                      });
                    }
                  }}
                >
                  End Match
                </button>
              </div>
            </>
          )}

          {scoringPipeline && (
            <div className="modal-overlay" style={{zIndex: 9999}}>
              <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-handle" />

                {scoringPipeline.stage === "EXTRAS_RUNS" && (
                  <>
                    <div style={{fontSize:18, fontWeight:800, marginBottom:4, color:"var(--amber)", textTransform:"uppercase"}}>
                      🎈 {scoringPipeline.ballType.replace("_", " ")} Conceded
                    </div>
                    <div style={{fontSize:12, color:"var(--muted)", marginBottom:16}}>
                      Select any additional physical runs or boundaries scored off this ball:
                    </div>
                    <div style={{display:"grid", gridTemplateColumns:"repeat(2, 1fr)", gap:8}}>
                      {[0, 1, 2, 3, 4, 6].map(r => (
                        <button key={r} className="btn btn-secondary" style={{padding:"12px", fontWeight:700}}
                          onClick={() => {
                            applyBall({ type: scoringPipeline.ballType, runs: r });
                            setScoringPipeline(null);
                          }}
                        >
                          {r === 0 ? "Just the Extra (0)" : `+ ${r} Runs`}
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {scoringPipeline.stage === "WICKET_TYPE" && (
                  <>
                    <div style={{fontSize:18, fontWeight:800, marginBottom:12, color:"var(--red)"}}>🎯 Select Dismissal Type</div>
                    <div style={{display:"grid", gridTemplateColumns:"repeat(2, 1fr)", gap:10}}>
                      {["Bowled", "Caught", "Stumped", "LBW", "Run Out", "Retired"].map(w => (
                        <button key={w} className="btn btn-secondary" style={{padding:"14px 10px", fontStyle:"normal", fontWeight:700, fontSize:13}}
                          onClick={() => {
                            if (w === "Run Out") {
                              setScoringPipeline({ stage: "RUN_OUT_RUNS" });
                            } else if (["Caught", "Stumped"].includes(w)) {
                              setScoringPipeline({ stage: "PICK_BOWLER_CREDIT", wicketType: w });
                            } else {
                              applyBall({ type: "wicket", runs: 0, wicketType: w });
                              setScoringPipeline(null);
                            }
                          }}
                        >
                          {w === "Retired" ? "Retired Hurt" : w}
                        </button>
                      ))}
                    </div>
                    <button className="btn btn-ghost" style={{marginTop:12, width:"100%"}} onClick={() => setScoringPipeline(null)}>Cancel</button>
                  </>
                )}

                {scoringPipeline.stage === "PICK_BOWLER_CREDIT" && (
                  <>
                    <div style={{fontSize:17, fontWeight:800, marginBottom:4, color:"var(--green)"}}>👤 Fielder Name / Number</div>
                    <div style={{fontSize:12, color:"var(--muted)", marginBottom:12}}>Log who completed the dismissal (Optional):</div>
                    <input 
                      type="text" 
                      placeholder="Enter fielder info..." 
                      value={pendingFielder}
                      onChange={e => setPendingFielder(e.target.value)}
                      style={{width:"100%", padding:"12px", background:"#151522", border:"1px solid #333", borderRadius:8, color:"#fff", marginBottom:16}}
                    />
                    <button className="btn btn-primary" style={{width:"100%", padding:"12px", fontWeight:700}}
                      onClick={() => {
                        applyBall({ 
                          type: "wicket", 
                          runs: 0, 
                          wicketType: scoringPipeline.wicketType,
                          fielder: pendingFielder || "Fielder"
                        });
                        setPendingFielder("");
                        setScoringPipeline(null);
                      }}
                    >
                      Submit Dismissal
                    </button>
                  </>
                )}

                {scoringPipeline.stage === "RUN_OUT_RUNS" && (
                  <>
                    <div style={{fontSize:17, fontWeight:800, marginBottom:4, color:"var(--amber)"}}>🏃 Run Out Completed Runs</div>
                    <div style={{fontSize:12, color:"var(--muted)", marginBottom:12}}>Select completed runs AND the delivery type:</div>
                    
                    <div style={{display:"flex", gap:6, marginBottom:12}}>
                      {["normal", "wide", "no_ball"].map(t => (
                        <button 
                          key={t} 
                          className="btn" 
                          style={{
                            flex:1, padding:"6px", fontSize:11, fontWeight:700,
                            background: (scoringPipeline.extraType || "normal") === t ? "var(--amber)" : "#2a2a40",
                            color: (scoringPipeline.extraType || "normal") === t ? "#000" : "#fff"
                          }}
                          onClick={() => setScoringPipeline({ ...scoringPipeline, extraType: t })}
                        >
                          {t.toUpperCase().replace("_", " ")}
                        </button>
                      ))}
                    </div>

                    <div style={{display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:8}}>
                      {[0, 1, 2, 3, 4].map(r => (
                        <button key={r} className="btn btn-secondary" style={{padding:"12px", fontWeight:700}}
                          onClick={() => setScoringPipeline({ stage: "PICK_VICTIM", preRuns: r, extraType: scoringPipeline.extraType || "normal" })}
                        >
                          {r} Run{r !== 1 && "s"} Safe
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {scoringPipeline.stage === "PICK_VICTIM" && (
                  <>
                    <div style={{fontSize:17, fontWeight:800, marginBottom:4, color:"var(--red)"}}>🛑 Which Batsman is OUT?</div>
                    <div style={{fontSize:12, color:"var(--muted)", marginBottom:16}}>Select the exact runner who fell short of their crease:</div>
                    <div style={{display:"flex", flexDirection:"column", gap:10}}>
                      <button className="btn btn-secondary" style={{padding:"14px", fontWeight:700, textAlign:"left"}}
                        onClick={() => {
                          setScoringPipeline({
                            ...scoringPipeline,
                            stage: "CHOOSE_NEXT_STRIKER",
                            victimPosition: "striker"
                          });
                        }}
                      >
                        💥 Striker: {striker?.name}
                      </button>
                      <button className="btn btn-secondary" style={{padding:"14px", fontWeight:700, textAlign:"left"}}
                        onClick={() => {
                          setScoringPipeline({
                            ...scoringPipeline,
                            stage: "CHOOSE_NEXT_STRIKER",
                            victimPosition: "non_striker"
                          });
                        }}
                      >
                        🏃 Non-Striker: {nonStriker?.name}
                      </button>
                    </div>
                  </>
                )}

                {scoringPipeline.stage === "CHOOSE_NEXT_STRIKER" && (
                  <>
                    <div style={{fontSize:17, fontWeight:800, marginBottom:4, color:"var(--green)"}}>🏏 Who Will Face Next Ball?</div>
                    <div style={{fontSize:12, color:"var(--muted)", marginBottom:16}}>Based on the point of crossing, select the next active striker:</div>
                    <div style={{display:"flex", flexDirection:"column", gap:10}}>
                      <button className="btn btn-secondary" style={{padding:"14px", fontWeight:700, textAlign:"left"}}
                        onClick={() => {
                          applyBall({ 
                            type: scoringPipeline.extraType === "normal" ? "wicket" : scoringPipeline.extraType, 
                            runs: scoringPipeline.preRuns, 
                            wicketType: "Run Out",
                            dismissedPosition: scoringPipeline.victimPosition,
                            nextFacingIntent: "surviving_batsman"
                          });
                          setScoringPipeline(null);
                        }}
                      >
                        🔄 Surviving Batsman ({scoringPipeline.victimPosition === "striker" ? nonStriker?.name : striker?.name})
                      </button>

                      <button className="btn btn-secondary" style={{padding:"14px", fontWeight:700, textAlign:"left"}}
                        onClick={() => {
                          applyBall({ 
                            type: scoringPipeline.extraType === "normal" ? "wicket" : scoringPipeline.extraType, 
                            runs: scoringPipeline.preRuns, 
                            wicketType: "Run Out",
                            dismissedPosition: scoringPipeline.victimPosition,
                            nextFacingIntent: "new_batsman"
                          });
                          setScoringPipeline(null);
                        }}
                      >
                        🆕 Brand New Incoming Batsman
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Bowler Select Modal */}
      {bowlerModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-handle" />
            <div style={{fontSize:18, fontWeight:800, marginBottom:16}}>⚡ Select Bowler</div>
            {inn.bowlers.map((b, i) => (
              <button key={i} className="btn btn-secondary btn" style={{width:"100%", marginBottom:8, textAlign:"left", padding:"14px 16px", opacity: i===inn.currentBowlerIdx && inn.balls>0 ? .5:1}} onClick={() => selectBowler(i)}>
                <span style={{fontWeight:700}}>{b.name}</span>
                <span style={{color:"var(--muted)", fontSize:12, marginLeft:8}}>{fmtOvers(b.balls)}-{b.runs}-{b.wickets}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Batsman Select Modal */}
      {batsmanModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-handle" />
            <div style={{fontSize:18, fontWeight:800, marginBottom:16, color: "var(--amber)"}}>
              {inn.strikerIdx === -1 && "🏏 Select Opening Striker"}
              {inn.strikerIdx !== -1 && inn.nonStrikerIdx === -1 && "🏃 Select Opening Non-Striker"}
              {inn.strikerIdx !== -1 && inn.nonStrikerIdx !== -1 && "🏏 Select New Batsman"}
            </div>
            {inn.batsmen.map((b, i) => {
              const isAvailable = b.balls === 0 || b.outDesc === "Retired Hurt";
              const isCurrentlyOnField = i === inn.strikerIdx || i === inn.nonStrikerIdx;

              if (isAvailable && !isCurrentlyOnField && !b.out) {
                return (
                  <button 
                    key={i} 
                    className="btn btn-secondary btn" 
                    style={{
                      width:"100%", 
                      marginBottom:8, 
                      textAlign:"left", 
                      padding:"14px 16px", 
                      border: b.outDesc === "Retired Hurt" ? "2px dashed var(--amber)" : "1px solid var(--border)",
                      background: b.outDesc === "Retired Hurt" ? "rgba(255, 165, 0, 0.05)" : ""
                    }} 
                    onClick={() => selectBatsman(i)}
                  >
                    <span>{b.name}</span>
                    {b.outDesc === "Retired Hurt" && <span style={{color:"var(--amber)", fontSize:11, float:"right", fontWeight:700}}>🔄 RE-ENTER</span>}
                  </button>
                );
              }
              return null;
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function InlineScorecardView({ match, getTeam }) {
  const [tab, setTab] = useState(0);
  const inn = match.innings[tab];
  return (
    <div style={{padding:"0 16px"}}>
      <div style={{display:"flex", marginBottom:16, borderBottom:"1px solid var(--border)"}}>
        {[0,1].map(i => (
          <button key={i} className={`innings-tab ${tab===i?"active":""}`} onClick={() => setTab(i)}>
            {getTeam(match.innings[i].team)?.name || `Innings ${i+1}`}
          </button>
        ))}
      </div>
      <div style={{fontFamily:"Bebas Neue", fontSize:36, color:"var(--text)", marginBottom:8}}>
        {inn.runs}/{inn.wickets} <span style={{fontSize:20, color:"var(--muted)"}}>{fmtOvers(inn.balls)} ov</span>
        {match.winner === "abrupt" && (
          <span style={{fontSize:12, color:"var(--red)", marginLeft:10, fontFamily:"Inter", fontWeight:700, verticalAlign:"middle"}} className="tag tag-red">
            MANUALLY TERMINATED
          </span>
        )}
      </div>
      <table style={{width:"100%", borderCollapse:"collapse", marginBottom:16}}>
        <thead><tr>
          {["Batsman","R","B","4s","6s"].map(h => <th key={h} style={{textAlign:h==="Batsman"?"left":"right", fontSize:11, color:"var(--muted)", padding:"6px 4px", borderBottom:"1px solid var(--border)", fontWeight:700, letterSpacing:.4}}>{h}</th>)}
        </tr></thead>
        <tbody>
          {inn.batsmen.filter(b => b.balls > 0 || !b.out).map((b,i) => (
            <tr key={i}>
              <td style={{padding:"8px 4px", fontSize:13, fontWeight:b.out?400:700, color:b.out?"var(--muted)":"var(--text)"}}>
                {b.name}{b.out ? <span style={{fontSize:11, color:"var(--muted)"}}> †</span> : ""}
                {i === inn.strikerIdx && !b.out && <span style={{color:"var(--green)"}}> *</span>}
              </td>
              {[b.runs, b.balls, b.fours, b.sixes].map((v,j) => <td key={j} style={{textAlign:"right", padding:"8px 4px", fontSize:13, fontWeight:600}}>{v}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="divider" />
      <table style={{width:"100%", borderCollapse:"collapse"}}>
        <thead><tr>
          {["Bowler","O","R","W"].map(h => <th key={h} style={{textAlign:h==="Bowler"?"left":"right", fontSize:11, color:"var(--muted)", padding:"6px 4px", borderBottom:"1px solid var(--border)", fontWeight:700, letterSpacing:.4}}>{h}</th>)}
        </tr></thead>
        <tbody>
          {inn.bowlers.filter(b => b.balls > 0).map((b,i) => (
            <tr key={i}>
              <td style={{padding:"8px 4px", fontSize:13, fontWeight:600}}>{b.name}</td>
              <td style={{textAlign:"right", padding:"8px 4px", fontSize:13}}>{fmtOvers(b.balls)}</td>
              <td style={{textAlign:"right", padding:"8px 4px", fontSize:13}}>{b.runs}</td>
              <td style={{textAlign:"right", padding:"8px 4px", fontSize:13, fontWeight:700, color:b.wickets>0?"var(--green)":"var(--text)"}}>{b.wickets}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


const generateScorecardImage = async (match, getTeam) => {
  const t1Name = getTeam(match.team1)?.name || "Team 1";
  const t2Name = getTeam(match.team2)?.name || "Team 2";
  const winTeamName = match.winner !== "abrupt" ? (getTeam(match.winner)?.name || "Tournament Team") : "";

  const fmtOversLocal = (balls) => `${Math.floor(balls / 6)}.${balls % 6}`;
  const calcSR = (runs, balls) => balls > 0 ? ((runs / balls) * 100).toFixed(0) : "0";
  const calcEcon = (runs, balls) => balls > 0 ? ((runs / (balls / 6))).toFixed(1) : "0.0";

  const renderInningsHTML = (inn, teamName) => {
    const activeBatters = inn.batsmen.filter(b => b.balls > 0 || b.out || b.outDesc === "Retired Hurt");
    const activeBowlers = inn.bowlers.filter(b => b.balls > 0);
    const totalExtras = Object.values(inn.extras).reduce((a, b) => a + b, 0);

    return `
      <div class="innings-section">
        <div class="team-header-row">
          <div class="score-display">${inn.runs}/${inn.wickets}</div>
          <div class="overs-display">${fmtOversLocal(inn.balls)} overs · RR ${(inn.runs / (inn.balls / 6 || 1) * 6).toFixed(2)}</div>
        </div>
        <div class="team-title-sub">${teamName.toUpperCase()} INNINGS</div>

        <div class="table-title">BATTING</div>
        <table class="scorecard-table">
          <thead>
            <tr>
              <th style="text-align: left;">Batsman</th>
              <th>R</th>
              <th>B</th>
              <th>4s</th>
              <th>6s</th>
              <th>SR</th>
            </tr>
          </thead>
          <tbody>
            ${activeBatters.map(b => {
              const dismissal = b.outDesc ? `(${b.outDesc})` : '';
              return `
                <tr>
                  <td style="text-align: left; font-weight: ${b.outDesc ? 'normal' : 'bold'}; color: ${b.outDesc ? '#8f8fbf' : '#ffffff'};">
                    ${b.name} <span class="dismissal-text">${dismissal}</span>
                  </td>
                  <td style="font-weight: bold; color: #ffffff;">${b.runs}</td>
                  <td>${b.balls}</td>
                  <td>${b.fours}</td>
                  <td>${b.sixes}</td>
                  <td style="font-weight: bold;">${calcSR(b.runs, b.balls)}</td>
                </tr>
              `;
            }).join('')}
            <tr class="extras-row">
              <td colspan="6" style="text-align: left; color: #8f8fbf; font-size: 13px; padding: 12px 6px;">
                Extras: ${totalExtras} (W ${inn.extras.wide}, NB ${inn.extras.noBall}, B ${inn.extras.bye}, LB ${inn.extras.legBye})
              </td>
            </tr>
            <tr class="total-row">
              <td style="text-align: left; font-weight: bold; color: #ffffff;">Total</td>
              <td colspan="5" style="text-align: right; font-weight: bold; color: #ffffff; font-size: 16px;">
                ${inn.runs}/${inn.wickets} (${fmtOversLocal(inn.balls)} ov)
              </td>
            </tr>
          </tbody>
        </table>

        <div class="table-title" style="margin-top: 24px;">BOWLING</div>
        <table class="scorecard-table">
          <thead>
            <tr>
              <th style="text-align: left;">Bowler</th>
              <th>O</th>
              <th>M</th>
              <th>R</th>
              <th>W</th>
              <th>Econ</th>
            </tr>
          </thead>
          <tbody>
            ${activeBowlers.map(b => `
              <tr>
                <td style="text-align: left; font-weight: bold; color: #ffffff;">${b.name}</td>
                <td>${fmtOversLocal(b.balls)}</td>
                <td>0</td>
                <td>${b.runs}</td>
                <td style="font-weight: bold; color: #00D46A;">${b.wickets}</td>
                <td style="font-weight: bold;">${calcEcon(b.runs, b.balls)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  };

  const htmlPayload = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Official Match Scorecard - ${t1Name} vs ${t2Name}</title>
      <style>
        :root { --green: #00D46A; --amber: #FFA500; --red: #FF4757; --bg: #0d0d16; --card-bg: #151522; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; background-color: var(--bg); color: #ffffff; margin: 0; padding: 16px; }
        .wrapper { max-width: 600px; margin: 0 auto; background-color: #0d0d16; padding-bottom: 40px; }
        
        .banner { border: 1px solid rgba(0, 212, 106, 0.3); background: rgba(0, 212, 106, 0.06); border-radius: 8px; padding: 12px; text-align: center; font-weight: bold; color: var(--green); font-size: 15px; margin-bottom: 24px; }
        .banner-tie { border: 1px solid rgba(255, 165, 0, 0.3); background: rgba(255, 165, 0, 0.06); color: var(--amber); }
        .banner-abrupt { border: 1px solid rgba(255, 71, 87, 0.3); background: rgba(255, 71, 87, 0.06); color: var(--red); }
        
        .innings-section { background-color: var(--card-bg); border-radius: 12px; padding: 16px; margin-bottom: 24px; box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
        .team-header-row { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 2px; }
        .score-display { font-size: 38px; font-weight: bold; color: #ffffff; letter-spacing: -0.5px; }
        .overs-display { font-size: 14px; color: #8f8fbf; }
        .team-title-sub { font-size: 12px; color: var(--green); font-weight: 800; letter-spacing: 1px; margin-bottom: 20px; }
        .table-title { font-size: 12px; font-weight: bold; color: #8f8fbf; letter-spacing: 1px; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 6px; margin-bottom: 8px; }
        .scorecard-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
        .scorecard-table th { font-size: 11px; color: #8f8fbf; padding: 8px 4px; text-align: right; text-transform: uppercase; }
        .scorecard-table td { font-size: 14px; color: #b5b5d6; padding: 10px 4px; text-align: right; border-bottom: 1px solid rgba(255,255,255,0.03); }
        .dismissal-text { font-size: 12px; color: #8f8fbf; font-weight: normal; margin-left: 4px; }
        .extras-row td, .total-row td { border-bottom: none; }
        .total-row { border-top: 1px solid rgba(255,255,255,0.08); }
        .footer-watermark { text-align: center; margin-top: 32px; font-size: 11px; color: rgba(255,255,255,0.2); letter-spacing: 0.5px; }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="banner ${
          match.winner === 'abrupt' ? 'banner-abrupt' : match.winner === 'tie' ? 'banner-tie' : ''
        }">
          ${
            match.winner === 'abrupt' 
              ? `⚠️ MATCH ABANDONED · ${match.winMargin.toUpperCase()}`
              : match.winner === 'tie'
                ? '💥 MATCH TIED! BOTH TEAMS LEVEL'
                : `🏆 ${winTeamName.toUpperCase()} WON BY ${match.winMargin.toUpperCase()}`
          }
        </div>
        
        ${renderInningsHTML(match.innings[0], t1Name)}
        ${renderInningsHTML(match.innings[1], t2Name)}

        <div class="footer-watermark">
          ⚡ Scored via Box Cricket Scoring Engine
        </div>
      </div>
    </body>
    </html>
  `;

  const blob = new Blob([htmlPayload], { type: "text/html" });
  const file = new File([blob], `Scorecard_Match_${match.id}.html`, { type: "text/html" });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: `Complete Scorecard: ${t1Name} vs ${t2Name}`,
        text: `Open this scorecard file to view the complete dual-innings ball-by-ball performance reports for ${t1Name} vs ${t2Name}!`
      });
    } catch (err) {
      if (err.name !== "AbortError") console.error("Sharing sequence rejected:", err);
    }
  } else {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Complete_Scorecard_Match_${match.id}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    alert("📲 Complete dual-team scorecard document saved directly to your downloads gallery! You can now send this file straight into any WhatsApp group.");
  }
};

// ─── MATCH RESULT PAGE ABRUPT-END PATCHED ────────────────────────────────────
function MatchResultPage({ match, getTeam, onSave, onNew }) {
  const t1 = getTeam(match.team1), t2 = getTeam(match.team2);
  const i1 = match.innings[0], i2 = match.innings[1];
  const winner = match.winner !== "abrupt" ? getTeam(match.winner) : null;
  
  const topBatter = [...i1.batsmen, ...i2.batsmen].sort((a,b) => b.runs-a.runs)[0];
  const topBowler = [...i1.bowlers, ...i2.bowlers].sort((a,b) => b.wickets-a.wickets || a.runs-b.runs)[0];
  const fmtOversLocal = (balls) => `${Math.floor(balls / 6)}.${balls % 6}`;

  return (
    <div className="page">
      <div style={{padding:"20px 16px 8px"}}>
        <span style={{fontFamily:"Bebas Neue", fontSize:24}}>MATCH RESULT</span>
      </div>
      <div className="result-hero" style={{
        margin:"8px 16px", 
        textAlign:"center",
        background: match.winner === "abrupt" ? "linear-gradient(135deg,#2a1515,#1f0d0d)" : undefined,
        borderColor: match.winner === "abrupt" ? "var(--red)" : undefined
      }}>
        <div style={{fontSize:36}}>{match.winner === "abrupt" ? "⚠️" : "🏆"}</div>
        <div style={{fontFamily:"Bebas Neue", fontSize:32, color: match.winner === "abrupt" ? "var(--red)" : "var(--green)", marginTop:8}}>
          {match.winner === "abrupt" ? "MATCH ABANDONED" : (winner?.name || "MATCH TIED")}
        </div>
        <div style={{fontSize:15, color:"var(--muted)", marginTop:4}}>
          {match.winner === "abrupt" ? match.winMargin : (match.winner !== "tie" && `won by ${match.winMargin}`)}
        </div>
      </div>

      <div style={{padding:"0 16px"}}>
        <div className="stat-row" style={{marginBottom:12}}>
          <div className="stat-box">
            <div style={{fontSize:12, color:"var(--muted)", fontWeight:700, marginBottom:4}}>{t1?.name}</div>
            <div className="stat-val">{i1.runs}/{i1.wickets}</div>
            <div className="stat-lbl">{fmtOversLocal(i1.balls)} overs</div>
          </div>
          <div className="stat-box">
            <div style={{fontSize:12, color:"var(--muted)", fontWeight:700, marginBottom:4}}>{t2?.name}</div>
            <div className="stat-val">{i2.runs}/{i2.wickets}</div>
            <div className="stat-lbl">{fmtOversLocal(i2.balls)} overs</div>
          </div>
        </div>

        {topBatter && (
          <div className="card2" style={{marginBottom:8}}>
            <div style={{fontSize:11, color:"var(--amber)", fontWeight:700, marginBottom:6, display:"flex", alignItems:"center", gap:4}}>
              <Icon.Star /> TOP BATTER
            </div>
            <div style={{display:"flex", justifyContent:"space-between"}}>
              <span style={{fontWeight:700}}>{topBatter.name}</span>
              <span style={{fontFamily:"Bebas Neue", fontSize:20, color:"var(--amber)"}}>{topBatter.runs}<span style={{fontSize:13, color:"var(--muted)"}}> ({topBatter.balls})</span></span>
            </div>
          </div>
        )}
        
        {topBowler && topBowler.wickets > 0 && (
          <div className="card2" style={{marginBottom:16}}>
            <div style={{fontSize:11, color:"var(--green)", fontWeight:700, marginBottom:6, display:"flex", alignItems:"center", gap:4}}>
              <Icon.Ball /> TOP BOWLER
            </div>
            <div style={{display:"flex", justifyContent:"space-between"}}>
              <span style={{fontWeight:700}}>{topBowler.name}</span>
              <span style={{fontFamily:"Bebas Neue", fontSize:20, color:"var(--green)"}}>{topBowler.wickets}/{topBowler.runs}</span>
            </div>
          </div>
        )}

        <button 
          className="btn" 
          style={{
            width: "100%", padding: "14px", fontWeight: 700, borderRadius: 12,
            background: "linear-gradient(135deg, #00D46A, #00A854)", color: "#000",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            boxShadow: "0 4px 12px rgba(0,212,106,0.2)", marginBottom: 10, border: "none", cursor: "pointer"
          }}
          onClick={() => generateScorecardImage(match, getTeam)}
        >
          📲 Share Official Scorecard Card
        </button>

        {/* <button className="btn btn-primary" style={{marginBottom:10, width: "100%"}} onClick={onSave}>Exit & View History</button> */}
        <button className="btn btn-primary" style={{marginBottom:10, width: "100%"}} onClick={() => onSave(null, true)}>Exit & View History</button>
        <button className="btn btn-secondary btn" style={{width:"100%"}} onClick={onNew}>New Match</button>
      </div>
    </div>
  );
}

// ─── New Match Page ───────────────────────────────────────────────────────────
function NewMatchPage({ teams, onStart, onBack }) {
  const [team1, setTeam1] = useState("");
  const [team2, setTeam2] = useState("");
  const [overs, setOvers] = useState(10);
  const [customOvers, setCustomOvers] = useState("");
  const [battingFirst, setBattingFirst] = useState("team1"); 

  const finalOvers = overs === "custom" ? parseInt(customOvers) || 10 : overs;

  return (
    <div className="page">
      <div className="page-header">
        <button className="back-btn" onClick={onBack}><Icon.Back /></button>
        <span className="page-title">New Match</span>
      </div>
      <div style={{padding:"0 16px"}}>
        <div className="form-group">
          <label className="label">Select Team 1 (Batting First)</label>
          <select className="input" value={team1} onChange={e => setTeam1(e.target.value)}>
            <option value="">Choose team...</option>
            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="label">Select Team 2</label>
          <select className="input" value={team2} onChange={e => setTeam2(e.target.value)}>
            <option value="">Choose team...</option>
            {teams.filter(t => t.id !== team1).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="label">Overs Per Innings</label>
          <div className="chip-row">
            {[1,2,5,10,20,"custom"].map(o => (
              <div key={o} className={`chip ${overs===o?"selected":""}`} onClick={() => setOvers(o)}>
                {o === "custom" ? "Custom" : `${o} ov`}
              </div>
            ))}
          </div>
          {overs === "custom" && (
            <input className="input" type="number" placeholder="Enter overs" value={customOvers} onChange={e => setCustomOvers(e.target.value)} style={{marginTop:10}} />
          )}
        </div>

        <div className="form-group">
          <label className="label">Who bats first?</label>
          <div className="chip-row">
            <div className={`chip ${battingFirst === "team1" ? "selected" : ""}`} onClick={() => setBattingFirst("team1")}>
              {teams.find(t => t.id === team1)?.name || "Team 1"}
            </div>
            <div className={`chip ${battingFirst === "team2" ? "selected" : ""}`} onClick={() => setBattingFirst("team2")}>
              {teams.find(t => t.id === team2)?.name || "Team 2"}
            </div>
          </div>
        </div>

        {team1 && team2 && (
          <div className="card" style={{marginBottom:16, background:"linear-gradient(135deg,#0d2a1a,#0a1e28)", borderColor:"rgba(0,212,106,.2)"}}>
            <div style={{fontSize:12, color:"var(--muted)", marginBottom:8}}>Match Preview</div>
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
              <div style={{textAlign:"center", flex:1}}>
                <div style={{width:8, height:8, borderRadius:"50%", background:teams.find(t=>t.id===team1)?.color||"var(--green)", margin:"0 auto 4px"}} />
                <div style={{fontWeight:700, fontSize:14}}>{teams.find(t=>t.id===team1)?.name}</div>
              </div>
              <div style={{fontFamily:"Bebas Neue", fontSize:24, color:"var(--muted)"}}>VS</div>
              <div style={{textAlign:"center", flex:1}}>
                <div style={{width:8, height:8, borderRadius:"50%", background:teams.find(t=>t.id===team2)?.color||"var(--amber)", margin:"0 auto 4px"}} />
                <div style={{fontWeight:700, fontSize:14}}>{teams.find(t=>t.id===team2)?.name}</div>
              </div>
            </div>
            <div style={{textAlign:"center", marginTop:8, fontSize:12, color:"var(--muted)"}}>{finalOvers} overs per side</div>
          </div>
        )}

        <button
          className="btn btn-primary"
          disabled={!team1 || !team2}
          onClick={() => onStart({ team1, team2, overs: finalOvers, battingFirst })}
          style={{opacity: team1 && team2 ? 1 : .4}}
        >
          Start Match
        </button>
      </div>
    </div>
  );
}

// ─── Teams Page ───────────────────────────────────────────────────────────────
function TeamsPage({ teams, onNew, onEdit, history }) {
  return (
    <div className="page">
      <div className="page-header" style={{justifyContent:"space-between"}}>
        <span className="page-title">Teams</span>
        <button className="btn btn-primary" style={{width:"auto", padding:"10px 18px", fontSize:14}} onClick={onNew}><Icon.Plus /></button>
      </div>
      <div className="px16">
        {teams.map(t => {
          const played = history.filter(m => m.team1===t.id || m.team2===t.id).length;
          const won = history.filter(m => m.winner===t.id).length;
          return (
            <div key={t.id} className="card" style={{cursor:"pointer", display:"flex", gap:12, alignItems:"center"}} onClick={() => onEdit(t)}>
              <div style={{width:48, height:48, borderRadius:14, background:`${t.color}22`, border:`2px solid ${t.color}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0}}>
                <span style={{fontSize:22}}>🏏</span>
              </div>
              <div style={{flex:1}}>
                <div style={{fontWeight:800, fontSize:15, marginBottom:2}}>{t.name}</div>
                <div style={{fontSize:12, color:"var(--muted)"}}>{t.players.length} players · {played} matches · {won} wins</div>
              </div>
              <button className="btn btn-ghost" style={{padding:"6px 8px"}}><Icon.Edit /></button>
            </div>
          );
        })}
        {teams.length === 0 && <div className="empty-state"><div style={{fontSize:36}}>👥</div><div style={{marginTop:8}}>No teams yet. Create one!</div></div>}
      </div>
    </div>
  );
}

function NewTeamPage({ onSave, onBack }) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#00D46A");
  const [players, setPlayers] = useState(Array(11).fill("").map((_,i) => `Player ${i+1}`));

  return (
    <div className="page">
      <div className="page-header">
        <button className="back-btn" onClick={onBack}><Icon.Back /></button>
        <span className="page-title">New Team</span>
      </div>
      <div style={{padding:"0 16px"}}>
        <div className="form-group">
          <label className="label">Team Name</label>
          <input className="input" placeholder="e.g. Gully Tigers" value={name} onChange={e=>setName(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="label">Team Color</label>
          <div style={{display:"flex", gap:10, flexWrap:"wrap"}}>
            {["#00D46A","#FFB800","#FF4757","#5352ED","#FF6B00","#00BCD4","#9C27B0","#E91E63"].map(c => (
              <div key={c} onClick={() => setColor(c)} style={{width:36, height:36, borderRadius:10, background:c, border: color===c?"3px solid white":"3px solid transparent", cursor:"pointer"}} />
            ))}
          </div>
        </div>
        <div className="form-group">
          <label className="label">Players (minimum 2)</label>
          {players.map((p, i) => (
            <input key={i} className="input" style={{marginBottom:8}} placeholder={`Player ${i+1}`} value={p} onChange={e => setPlayers(ps => ps.map((v,j) => j===i ? e.target.value : v))} />
          ))}
          <button className="btn btn-ghost" style={{width:"100%", marginTop:4, color:"var(--green)"}} onClick={() => setPlayers(ps => [...ps, `Player ${ps.length+1}`])}>
            + Add Player
          </button>
        </div>
        <button className="btn btn-primary" disabled={!name || players.filter(p=>p.trim()).length < 2} style={{opacity: name && players.filter(p=>p.trim()).length>=2?1:.4}}
          onClick={() => onSave({ id:generateId(), name:name.trim(), color, players:players.filter(p=>p.trim()) })}>
          Create Team
        </button>
      </div>
    </div>
  );
}

function EditTeamPage({ team, onSave, onBack, onDelete }) {
  const [name, setName] = useState(team.name);
  const [color, setColor] = useState(team.color);
  const [players, setPlayers] = useState([...team.players]);
  return (
    <div className="page">
      <div className="page-header">
        <button className="back-btn" onClick={onBack}><Icon.Back /></button>
        <span className="page-title">Edit Team</span>
      </div>
      <div style={{padding:"0 16px"}}>
        <div className="form-group"><label className="label">Team Name</label><input className="input" value={name} onChange={e=>setName(e.target.value)} /></div>
        <div className="form-group">
          <label className="label">Team Color</label>
          <div style={{display:"flex", gap:10, flexWrap:"wrap"}}>
            {["#00D46A","#FFB800","#FF4757","#5352ED","#FF6B00","#00BCD4","#9C27B0","#E91E63"].map(c => (
              <div key={c} onClick={() => setColor(c)} style={{width:36, height:36, borderRadius:10, background:c, border: color===c?"3px solid white":"3px solid transparent", cursor:"pointer"}} />
            ))}
          </div>
        </div>
        <div className="form-group">
          <label className="label">Players</label>
          {players.map((p, i) => (
            <div key={i} style={{display:"flex", gap:8, marginBottom:8}}>
              <input className="input" value={p} onChange={e => setPlayers(ps => ps.map((v,j) => j===i ? e.target.value : v))} />
              <button className="btn btn-danger btn" style={{flexShrink:0, padding:"10px 12px"}} onClick={() => setPlayers(ps => ps.filter((_,j)=>j!==i))}><Icon.Delete /></button>
            </div>
          ))}
          <button className="btn btn-ghost" style={{width:"100%", color:"var(--green)"}} onClick={() => setPlayers(ps => [...ps, ""])}>+ Add Player</button>
        </div>
        <button className="btn btn-primary" style={{marginBottom:10}} onClick={() => onSave({...team, name:name.trim(), color, players:players.filter(p=>p.trim())})}>Save Changes</button>
        <button className="btn btn-danger btn" style={{width:"100%"}} onClick={() => { if(window.confirm("Delete this team?")) onDelete(team.id); }}>Delete Team</button>
      </div>
    </div>
  );
}

// ─── HISTORY PAGE VISUAL PANEL COMPONENT ABRUPT-END PATCHED ──────────────────
function HistoryPage({ history, teams, onView, getTeam }) {
  const fmtOversLocal = (balls) => `${Math.floor(balls / 6)}.${balls % 6}`;

  return (
    <div className="page">
      <div style={{ padding: "20px 16px 8px" }}>
        <span style={{ fontFamily: "Bebas Neue", fontSize: 24, letterSpacing: 1 }}>MATCH HISTORY</span>
        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
          Tap a match card to open details or share the complete ledger
        </div>
      </div>

      <div className="px16" style={{ display: "flex", flexDirection: "column", gap: 12, paddingBottom: 40 }}>
        {history.length === 0 ? (
          <div className="empty-state" style={{ paddingTop: 60 }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>📋</div>
            <div style={{ fontWeight: 700, color: "var(--text)" }}>No Past Matches</div>
            <div style={{ fontSize: 13, color: "var(--muted)" }}>Matches will appear here once saved.</div>
          </div>
        ) : (
          history.map((m) => {
            const t1 = getTeam(m.team1);
            const t2 = getTeam(m.team2);
            const i1 = m.innings[0];
            const i2 = m.innings[1];
            const winTeam = m.winner !== "abrupt" ? getTeam(m.winner) : null;

            return (
              <div 
                key={m.id} 
                className="card" 
                style={{ 
                  margin: 0, 
                  padding: "16px", 
                  position: "relative", 
                  cursor: "pointer",
                  border: "1px solid rgba(255,255,255,0.05)"
                }}
                onClick={() => onView(m)}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>
                    📅 {m.date || "Past Match"}
                  </span>
                  
                  <button
                    className="btn-ghost"
                    style={{
                      padding: "6px 10px",
                      background: "rgba(0, 212, 106, 0.1)",
                      border: "1px solid rgba(0, 212, 106, 0.2)",
                      borderRadius: "8px",
                      color: "var(--green)",
                      fontSize: "12px",
                      fontWeight: "bold",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 4
                    }}
                    onClick={(e) => {
                      e.stopPropagation(); 
                      generateScorecardImage(m, getTeam);
                    }}
                  >
                    Scorecard 📤
                  </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: 700, fontSize: 15, color: "#fff" }}>{t1?.name}</span>
                    <span style={{ fontFamily: "Bebas Neue", fontSize: 18, color: "var(--text)" }}>
                      {i1.runs}/{i1.wickets} <span style={{ fontSize: 12, color: "var(--muted)", fontFamily: "sans-serif" }}>({fmtOversLocal(i1.balls)} ov)</span>
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: 700, fontSize: 15, color: "#fff" }}>{t2?.name}</span>
                    <span style={{ fontFamily: "Bebas Neue", fontSize: 18, color: "var(--text)" }}>
                      {i2.runs}/{i2.wickets} <span style={{ fontSize: 12, color: "var(--muted)", fontFamily: "sans-serif" }}>({fmtOversLocal(i2.balls)} ov)</span>
                    </span>
                  </div>
                </div>

                <div style={{ 
                  borderTop: "1px solid rgba(255,255,255,0.05)", 
                  paddingTop: 8, 
                  fontSize: 12, 
                  color: m.winner === "abrupt" ? "var(--red)" : m.winner === "tie" ? "var(--amber)" : "var(--green)", 
                  fontWeight: 600 
                }}>
                  {m.winner === "abrupt" ? (
                    <>⚠️ {m.winMargin}</>
                  ) : m.winner === "tie" ? (
                    "💥 Match Tied!"
                  ) : (
                    <>🏆 {winTeam?.name || "Tournament Team"} won by {m.winMargin}</>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function MatchCard({ match, getTeam, onClick }) {
  const t1 = getTeam(match.team1), t2 = getTeam(match.team2);
  const i1 = match.innings?.[0], i2 = match.innings?.[1];
  const winner = match.winner !== "abrupt" ? getTeam(match.winner) : null;
  if (!i1 || !i2) return null;
  return (
    <div className="card" style={{cursor:"pointer"}} onClick={onClick}>
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10}}>
        <div className="tag tag-muted" style={{fontSize:11}}>{fmtDate(match.date)}</div>
        {match.winner === "abrupt" && <div className="tag tag-red" style={{fontSize:11}}>⚠️ Abandoned</div>}
        {match.winner === "tie" && <div className="tag tag-amber" style={{fontSize:11}}>🤝 Tied</div>}
        {winner && <div className="tag tag-green" style={{fontSize:11}}>🏆 {winner.name}</div>}
      </div>
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
        <div style={{flex:1}}>
          <div style={{display:"flex", alignItems:"center", gap:6, marginBottom:6}}>
            <div style={{width:8, height:8, borderRadius:"50%", background:t1?.color||"var(--green)"}} />
            <span style={{fontWeight:700, fontSize:14}}>{t1?.name}</span>
          </div>
          <div style={{fontFamily:"Bebas Neue", fontSize:24}}>{i1.runs}/{i1.wickets} <span style={{fontSize:14, color:"var(--muted)"}}>{fmtOvers(i1.balls)} ov</span></div>
        </div>
        <div style={{fontFamily:"Bebas Neue", fontSize:16, color:"var(--muted)", padding:"0 12px"}}>VS</div>
        <div style={{flex:1, textAlign:"right"}}>
          <div style={{display:"flex", alignItems:"center", gap:6, marginBottom:6, justifyContent:"flex-end"}}>
            <span style={{fontWeight:700, fontSize:14}}>{t2?.name}</span>
            <div style={{width:8, height:8, borderRadius:"50%", background:t2?.color||"var(--amber)"}} />
          </div>
          <div style={{fontFamily:"Bebas Neue", fontSize:24}}>{i2.runs}/{i2.wickets} <span style={{fontSize:14, color:"var(--muted)"}}>{fmtOvers(i2.balls)} ov</span></div>
        </div>
      </div>
    </div>
  );
}

// ─── Scorecard Page ABRUPT-END PATCHED ───────────────────────────────────────
function ScorecardPage({ match, teams, onBack }) {
  const getTeam = (id) => teams.find(t => t.id === id);
  const [tab, setTab] = useState(0);
  const inn = match.innings[tab];
  const winner = match.winner !== "abrupt" ? getTeam(match.winner) : null;
  const totalExtras = Object.values(inn.extras).reduce((a,b)=>a+b,0);

  return (
    <div className="page">
      <div className="page-header">
        <button className="back-btn" onClick={onBack}><Icon.Back /></button>
        <div>
          <div className="page-title">{getTeam(match.team1)?.name} vs {getTeam(match.team2)?.name}</div>
          <div style={{fontSize:11, color:"var(--muted)"}}>{fmtDate(match.date)} · {match.overs} overs</div>
        </div>
      </div>

      {match.winner && (
        <div style={{
          margin:"0 16px 12px", 
          background: match.winner === "abrupt" ? "linear-gradient(90deg,rgba(255,71,87,.1),transparent)" : "linear-gradient(90deg,rgba(0,212,106,.1),transparent)", 
          border: match.winner === "abrupt" ? "1px solid rgba(255,71,87,.2)" : "1px solid rgba(0,212,106,.2)", 
          borderRadius:12, padding:"10px 14px", display:"flex", alignItems:"center", gap:8
        }}>
          <span style={{fontSize:18}}>{match.winner === "abrupt" ? "⚠️" : "🏆"}</span>
          <span style={{fontWeight:700, color: match.winner === "abrupt" ? "var(--red)" : "var(--green)", fontSize:14}}>
            {match.winner === "abrupt" ? "Match ended abruptly before conclusion" : 
             match.winner === "tie" ? "Match Tied" : `${winner?.name} won by ${match.winMargin}`}
          </span>
        </div>
      )}

      <div style={{display:"flex", margin:"0 16px 16px", borderBottom:"1px solid var(--border)"}}>
        {[0,1].map(i => (
          <button key={i} className={`innings-tab ${tab===i?"active":""}`} onClick={() => setTab(i)}>
            {getTeam(match.innings[i].team)?.name}
          </button>
        ))}
      </div>

      <div className="px16">
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:12}}>
          <div style={{fontFamily:"Bebas Neue", fontSize:40}}>{inn.runs}/{inn.wickets}</div>
          <div style={{color:"var(--muted)", fontSize:14}}>{fmtOvers(inn.balls)} overs · RR {calcRR(inn.runs, inn.balls)}</div>
        </div>

        <div style={{fontWeight:700, fontSize:12, color:"var(--muted)", letterSpacing:.8, marginBottom:8}}>BATTING</div>
        <div style={{overflowX:"auto", marginBottom:16}}>
          <table style={{width:"100%", borderCollapse:"collapse", minWidth:280}}>
            <thead><tr>
              {["Batsman","R","B","4s","6s","SR"].map(h => <th key={h} className="pts-table" style={{textAlign:h==="Batsman"?"left":"right", fontSize:11, color:"var(--muted)", padding:"6px 4px", borderBottom:"1px solid var(--border)"}}>{h}</th>)}
            </tr></thead>
            <tbody>
              {inn.batsmen.filter(b => b.balls > 0 || b.out).map((b,i) => {
                const sr = b.balls > 0 ? ((b.runs/b.balls)*100).toFixed(0) : "-";
                return (
                  <tr key={i}>
                    <td style={{padding:"8px 4px", fontSize:13, fontWeight:b.out?400:700, color:b.out?"var(--muted)":"var(--text)"}}>
                      {b.name} {b.out && <span style={{fontSize:11, color:"var(--muted)"}}>({b.outDesc})</span>}
                    </td>
                    {[b.runs,b.balls,b.fours,b.sixes,sr].map((v,j) => <td key={j} style={{textAlign:"right", padding:"8px 4px", fontSize:13, fontWeight: j===0?"700":"500"}}>{v}</td>)}
                  </tr>
                );
              })}
              <tr><td colSpan={6} style={{padding:"8px 4px", fontSize:12, color:"var(--muted)"}}>Extras: {totalExtras} (W {inn.extras.wide}, NB {inn.extras.noBall}, B {inn.extras.bye}, LB {inn.extras.legBye})</td></tr>
              <tr style={{borderTop:"1px solid var(--border)"}}><td style={{padding:"8px 4px", fontWeight:800, fontSize:14}}>Total</td><td colSpan={5} style={{textAlign:"right", padding:"8px 4px", fontWeight:800, fontSize:14}}>{inn.runs}/{inn.wickets} ({fmtOvers(inn.balls)} ov)</td></tr>
            </tbody>
          </table>
        </div>

        <div style={{fontWeight:700, fontSize:12, color:"var(--muted)", letterSpacing:.8, marginBottom:8}}>BOWLING</div>
        <table style={{width:"100%", borderCollapse:"collapse", marginBottom:24}}>
          <thead><tr>
            {["Bowler","O","M","R","W","Econ"].map(h => <th key={h} style={{textAlign:h==="Bowler"?"left":"right", fontSize:11, color:"var(--muted)", padding:"6px 4px", borderBottom:"1px solid var(--border)", fontWeight:700}}>{h}</th>)}
          </tr></thead>
          <tbody>
            {inn.bowlers.filter(b => b.balls > 0).map((b,i) => {
              const econ = b.balls > 0 ? ((b.runs/(b.balls/6))).toFixed(1) : "-";
              return (
                <tr key={i}>
                  <td style={{padding:"8px 4px", fontSize:13, fontWeight:600}}>{b.name}</td>
                  <td style={{textAlign:"right", padding:"8px 4px", fontSize:13}}>{fmtOvers(b.balls)}</td>
                  <td style={{textAlign:"right", padding:"8px 4px", fontSize:13}}>0</td>
                  <td style={{textAlign:"right", padding:"8px 4px", fontSize:13}}>{b.runs}</td>
                  <td style={{textAlign:"right", padding:"8px 4px", fontSize:13, fontWeight:700, color:b.wickets>0?"var(--green)":"var(--text)"}}>{b.wickets}</td>
                  <td style={{textAlign:"right", padding:"8px 4px", fontSize:13}}>{econ}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Tournaments Page ─────────────────────────────────────────────────────────
function TournamentsPage({ tournaments, teams, onNew, onView }) {
  return (
    <div className="page">
      <div className="page-header" style={{justifyContent:"space-between"}}>
        <span className="page-title">Leagues</span>
        <button className="btn btn-primary" style={{width:"auto", padding:"10px 18px", fontSize:14}} onClick={onNew}><Icon.Plus /></button>
      </div>
      <div className="px16">
        {tournaments.length === 0 && <div className="empty-state"><div style={{fontSize:36}}>🏆</div><div style={{marginTop:8}}>No leagues yet</div></div>}
        {tournaments.map(t => <TournamentCard key={t.id} t={t} teams={teams} onClick={() => onView(t)} />)}
      </div>
    </div>
  );
}

function TournamentCard({ t, teams, onClick }) {
  const getTeam = (id) => teams.find(x => x.id === id);
  const completed = t.matches.filter(m => m.result).length;
  return (
    <div className="card" style={{cursor:"pointer"}} onClick={onClick}>
      <div style={{display:"flex", justifyContent:"space-between", marginBottom:8}}>
        <span style={{fontWeight:800, fontSize:16}}>{t.name}</span>
        <span className={`tag ${t.status==="ongoing"?"tag-green":"tag-muted"}`}>{t.status==="ongoing"?"🟢 Ongoing":"Completed"}</span>
      </div>
      <div style={{fontSize:12, color:"var(--muted)", marginBottom:10}}>{fmtDate(t.date)} · {t.teams.length} teams · {t.overs} ov</div>
      <div style={{display:"flex", gap:4, flexWrap:"wrap", marginBottom:8}}>
        {t.teams.map(id => {
          const team = getTeam(id);
          return team ? <div key={id} className="tag tag-muted" style={{fontSize:11, gap:4}}><div style={{width:6, height:6, borderRadius:"50%", background:team.color}} />{team.name}</div> : null;
        })}
      </div>
      <div style={{fontSize:12, color:"var(--muted)"}}>{completed}/{t.matches.length} matches played</div>
    </div>
  );
}

function NewTournamentPage({ teams, onSave, onBack }) {
  const [name, setName] = useState("");
  const [selectedTeams, setSelectedTeams] = useState([]);
  const [overs, setOvers] = useState(10);

  const toggleTeam = (id) => setSelectedTeams(ts => ts.includes(id) ? ts.filter(t=>t!==id) : [...ts, id]);

  const generateMatches = (teamIds) => {
    const matches = [];
    for (let i = 0; i < teamIds.length; i++) {
      for (let j = i+1; j < teamIds.length; j++) {
        matches.push({ id:generateId(), team1:teamIds[i], team2:teamIds[j], result:null, date:new Date(Date.now() + matches.length*86400000*2).toISOString(), t1Runs:0, t1Balls:0, t2Runs:0, t2Balls:0 });
      }
    }
    return matches;
  };

  return (
    <div className="page">
      <div className="page-header">
        <button className="back-btn" onClick={onBack}><Icon.Back /></button>
        <span className="page-title">New League</span>
      </div>
      <div style={{padding:"0 16px"}}>
        <div className="form-group"><label className="label">League Name</label><input className="input" placeholder="e.g. Mohalla Premier League" value={name} onChange={e=>setName(e.target.value)} /></div>
        <div className="form-group">
          <label className="label">Overs</label>
          <div className="chip-row">
            {[5,10,20].map(o => <div key={o} className={`chip ${overs===o?"selected":""}`} onClick={()=>setOvers(o)}>{o} ov</div>)}
          </div>
        </div>
        <div className="form-group">
          <label className="label">Select Teams (minimum 2)</label>
          {teams.map(t => (
            <div key={t.id} className={`card2 ${selectedTeams.includes(t.id)?"":"opacity-70"}`} style={{cursor:"pointer", display:"flex", alignItems:"center", gap:10, border:`1px solid ${selectedTeams.includes(t.id)?"rgba(0,212,106,.3)":"var(--border)"}`}} onClick={() => toggleTeam(t.id)}>
              <div style={{width:10, height:10, borderRadius:"50%", background:t.color}} />
              <span style={{fontWeight:700, flex:1}}>{t.name}</span>
              {selectedTeams.includes(t.id) && <Icon.Check />}
            </div>
          ))}
        </div>
        <button className="btn btn-primary" disabled={!name || selectedTeams.length < 2} style={{opacity: name && selectedTeams.length>=2?1:.4}}
          onClick={() => onSave({ id:generateId(), name:name.trim(), date:now(), teams:selectedTeams, overs, status:"ongoing", matches:generateMatches(selectedTeams) })}>
          Create League
        </button>
      </div>
    </div>
  );
}

function TournamentPage({ tournament, teams, onBack }) {
  const getTeam = (id) => teams.find(t => t.id === id);
  const [activeTab, setActiveTab] = useState("schedule");

  const pts = tournament.teams.map(id => {
    const team = getTeam(id);
    const tMatches = tournament.matches.filter(m => m.result && (m.team1===id || m.team2===id));
    const wins = tMatches.filter(m => m.result===id).length;
    const losses = tMatches.length - wins;
    let forR=0, forB=0, agR=0, agB=0;
    tMatches.forEach(m => {
      if (m.team1 === id) { forR += m.t1Runs; forB += m.t1Balls; agR += m.t2Runs; agB += m.t2Balls; }
      else { forR += m.t2Runs; forB += m.t2Balls; agR += m.t1Runs; agB += m.t1Balls; }
    });
    return { id, name:team?.name||id, color:team?.color||"var(--green)", played:tMatches.length, wins, losses, pts:wins*2, nrr:calcNRR(forR,forB,agR,agB) };
  }).sort((a,b) => b.pts-a.pts || parseFloat(b.nrr)-parseFloat(a.nrr));

  return (
    <div className="page">
      <div className="page-header">
        <button className="back-btn" onClick={onBack}><Icon.Back /></button>
        <div>
          <div className="page-title" style={{fontSize:18}}>{tournament.name}</div>
          <div style={{fontSize:11, color:"var(--muted)"}}>{tournament.overs} ov · {tournament.teams.length} teams</div>
        </div>
      </div>

      <div style={{display:"flex", margin:"0 16px 16px", borderBottom:"1px solid var(--border)"}}>
        {[["schedule","Schedule"],["points","Points"]].map(([id,label]) => (
          <button key={id} className={`innings-tab ${activeTab===id?"active":""}`} onClick={() => setActiveTab(id)}>{label}</button>
        ))}
      </div>

      {activeTab === "points" && (
        <div className="px16">
          <div className="card" style={{padding:"8px 0"}}>
            <table className="pts-table" style={{width:"100%"}}>
              <thead><tr>
                <th>Team</th><th style={{textAlign:"center"}}>P</th><th style={{textAlign:"center"}}>W</th><th style={{textAlign:"center"}}>L</th><th style={{textAlign:"right"}}>NRR</th><th style={{textAlign:"right"}}>Pts</th>
              </tr></thead>
              <tbody>
                {pts.map((p, i) => (
                  <tr key={p.id}>
                    <td><div style={{display:"flex", alignItems:"center", gap:6}}><div style={{width:8, height:8, borderRadius:"50%", background:p.color}} />{p.name}</div></td>
                    <td style={{textAlign:"center"}}>{p.played}</td>
                    <td style={{textAlign:"center", color:"var(--green)"}}>{p.wins}</td>
                    <td style={{textAlign:"center", color:"var(--red)"}}>{p.losses}</td>
                    <td style={{textAlign:"right", fontSize:12, color: parseFloat(p.nrr)>=0?"var(--green)":"var(--red)"}}>{p.nrr}</td>
                    <td style={{textAlign:"right", fontFamily:"Bebas Neue", fontSize:18, color:"var(--amber)"}}>{p.pts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "schedule" && (
        <div className="px16">
          {tournament.matches.map(m => {
            const t1 = getTeam(m.team1), t2 = getTeam(m.team2);
            const winner = m.result !== "abrupt" ? getTeam(m.result) : null;
            return (
              <div key={m.id} className="card" style={{marginBottom:10}}>
                <div style={{display:"flex", justifyContent:"space-between", marginBottom:8}}>
                  <span style={{fontSize:11, color:"var(--muted)"}}>{fmtDate(m.date)}</span>
                  {m.result ? <div className="tag tag-green" style={{fontSize:11}}>✓ Done</div> : <div className="tag tag-amber" style={{fontSize:11}}>Scheduled</div>}
                </div>
                <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
                  <div style={{flex:1}}>
                    <div style={{display:"flex", alignItems:"center", gap:5, marginBottom:4}}><div style={{width:7, height:7, borderRadius:"50%", background:t1?.color}} /><span style={{fontWeight:700, fontSize:13}}>{t1?.name}</span></div>
                    {m.result && <div style={{fontFamily:"Bebas Neue", fontSize:20}}>{m.t1Runs}<span style={{fontSize:12, color:"var(--muted)"}}>/{m.t1Balls && fmtOvers(m.t1Balls)} ov</span></div>}
                  </div>
                  <div style={{fontFamily:"Bebas Neue", fontSize:14, color:"var(--muted)", padding:"0 8px"}}>VS</div>
                  <div style={{flex:1, textAlign:"right"}}>
                    <div style={{display:"flex", alignItems:"center", gap:5, marginBottom:4, justifyContent:"flex-end"}}><span style={{fontWeight:700, fontSize:13}}>{t2?.name}</span><div style={{width:7, height:7, borderRadius:"50%", background:t2?.color}} /></div>
                    {m.result && <div style={{fontFamily:"Bebas Neue", fontSize:20}}>{m.t2Runs}<span style={{fontSize:12, color:"var(--muted)"}}>/{m.t2Balls && fmtOvers(m.t2Balls)} ov</span></div>}
                  </div>
                </div>
                {m.result === "abrupt" && <div style={{textAlign:"center", marginTop:8, fontSize:12, color:"var(--red)", fontWeight:700}}>⚠️ Match Abandoned Abruptly</div>}
                {m.result === "tie" && <div style={{textAlign:"center", marginTop:8, fontSize:12, color:"var(--amber)", fontWeight:700}}>🤝 Match Tied</div>}
                {winner && <div style={{textAlign:"center", marginTop:8, fontSize:12, color:"var(--green)", fontWeight:700}}>🏆 {winner.name} won by {m.winMargin}</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}