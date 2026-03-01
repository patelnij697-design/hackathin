import { useState, useEffect, useCallback } from "react";

// ── helpers ──────────────────────────────────────────────────────────────────
const STORAGE_KEY = "mindbloom_entries";

const load = async () => {
  try { const r = await window.storage.get(STORAGE_KEY); return r ? JSON.parse(r.value) : []; }
  catch { return []; }
};
const save = async (entries) => {
  try { await window.storage.set(STORAGE_KEY, JSON.stringify(entries)); } catch {}
};

const todayStr = () => new Date().toISOString().slice(0, 10);

const std = (arr) => {
  if (arr.length < 2) return 0;
  const m = arr.reduce((a, b) => a + b, 0) / arr.length;
  return Math.sqrt(arr.reduce((a, b) => a + (b - m) ** 2, 0) / arr.length);
};

const correlation = (xs, ys) => {
  const n = xs.length;
  if (n < 2) return null;
  const mx = xs.reduce((a,b)=>a+b,0)/n, my = ys.reduce((a,b)=>a+b,0)/n;
  const num = xs.reduce((s,x,i)=>s+(x-mx)*(ys[i]-my),0);
  const den = Math.sqrt(xs.reduce((s,x)=>s+(x-mx)**2,0)*ys.reduce((s,y)=>s+(y-my)**2,0));
  return den ? (num/den).toFixed(2) : null;
};

const wellnessScore = (e) =>
  Math.max(1, Math.min(10, +((e.mood + e.energy + e.sleep + e.social - e.stress) / 5).toFixed(1)));

const burnoutRisk = (entries) => {
  if (entries.length < 3) return false;
  const last3 = entries.slice(-3);
  return last3.every(e => e.stress >= 7 && e.sleep <= 4 && e.energy <= 4);
};

const moodEmoji = (v) => {
  const emojis = ["😭","😢","😟","😕","😐","🙂","😊","😀","🤩","🌟"];
  return emojis[Math.min(9, Math.max(0, v - 1))];
};

const scoreColor = (s) => {
  if (s >= 7) return "#4ade80";
  if (s >= 5) return "#facc15";
  return "#f87171";
};

const TAGS = ["School","Work","Family","Friends","Health","Personal goals","Other"];

// ── Slider component ──────────────────────────────────────────────────────────
function Slider({ label, value, onChange, low, high, emoji }) {
  return (
    <div style={{ marginBottom: "1.6rem" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"0.4rem" }}>
        <span style={{ fontFamily:"'Playfair Display',serif", fontSize:"0.95rem", color:"#e2e8f0", letterSpacing:"0.02em" }}>{label}</span>
        <span style={{ fontSize:"1.6rem", transition:"all 0.2s" }}>{emoji(value)}</span>
      </div>
      <div style={{ position:"relative" }}>
        <input
          type="range" min="1" max="10" value={value}
          onChange={e => onChange(+e.target.value)}
          style={{
            width:"100%", appearance:"none", height:"6px",
            borderRadius:"3px", outline:"none", cursor:"pointer",
            background:`linear-gradient(to right, #818cf8 0%, #818cf8 ${(value-1)/9*100}%, #1e293b ${(value-1)/9*100}%, #1e293b 100%)`,
          }}
        />
      </div>
      <div style={{ display:"flex", justifyContent:"space-between", fontSize:"0.7rem", color:"#64748b", marginTop:"0.2rem" }}>
        <span>{low}</span><span style={{color:"#818cf8",fontWeight:600}}>{value}/10</span><span>{high}</span>
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [entries, setEntries] = useState([]);
  const [view, setView] = useState("check"); // check | summary | history
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [alreadyDone, setAlreadyDone] = useState(false);

  const [mood, setMood] = useState(5);
  const [stress, setStress] = useState(5);
  const [energy, setEnergy] = useState(5);
  const [sleep, setSleep] = useState(5);
  const [social, setSocial] = useState(5);
  const [tags, setTags] = useState([]);
  const [word, setWord] = useState("");
  const [todayEntry, setTodayEntry] = useState(null);

  useEffect(() => {
    load().then(data => {
      setEntries(data);
      const today = data.find(e => e.date === todayStr());
      if (today) { setAlreadyDone(true); setTodayEntry(today); setView("summary"); }
      setLoading(false);
    });
  }, []);

  const toggleTag = (t) => setTags(ts => ts.includes(t) ? ts.filter(x=>x!==t) : [...ts,t]);

  const submit = async () => {
    const entry = { date: todayStr(), mood, stress, energy, sleep, social, tags, word, ts: Date.now() };
    const updated = [...entries.filter(e => e.date !== todayStr()), entry].sort((a,b)=>a.ts-b.ts);
    setEntries(updated);
    setTodayEntry(entry);
    await save(updated);
    setView("summary");
  };

  const clearAll = async () => {
    if (!confirm("Clear all data permanently?")) return;
    setEntries([]); setTodayEntry(null); setAlreadyDone(false);
    await save([]);
    setView("check"); setStep(1);
  };

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(entries, null, 2)], { type:"application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = "mindbloom_data.json"; a.click();
  };

  // derived
  const last7Moods = entries.slice(-7).map(e=>e.mood);
  const volatility = std(last7Moods).toFixed(2);
  const stressVals = entries.map(e=>e.stress), sleepVals = entries.map(e=>e.sleep);
  const corr = correlation(stressVals, sleepVals);
  const risk = burnoutRisk(entries);

  if (loading) return (
    <div style={outerStyle}>
      <div style={{ color:"#818cf8", fontFamily:"'Playfair Display',serif", fontSize:"1.4rem" }}>Loading…</div>
    </div>
  );

  return (
    <div style={outerStyle}>
      <style>{css}</style>
      {/* Header */}
      <div style={{ textAlign:"center", marginBottom:"2rem" }}>
        <div style={{ fontSize:"2rem", marginBottom:"0.3rem" }}>🌱</div>
        <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.8rem", color:"#e2e8f0", margin:0, letterSpacing:"-0.02em" }}>MindBloom</h1>
        <p style={{ color:"#475569", fontSize:"0.78rem", margin:"0.3rem 0 0", letterSpacing:"0.08em", textTransform:"uppercase" }}>Daily Wellness</p>
      </div>

      {/* Nav */}
      <div style={{ display:"flex", gap:"0.5rem", marginBottom:"1.5rem", background:"#0f172a", borderRadius:"12px", padding:"4px" }}>
        {["check","history"].map(v => (
          <button key={v} onClick={() => setView(v)} style={{
            flex:1, padding:"0.5rem", border:"none", borderRadius:"9px", cursor:"pointer", fontSize:"0.8rem", fontWeight:600,
            background: view===v ? "#818cf8" : "transparent", color: view===v ? "#0f172a" : "#64748b",
            transition:"all 0.2s", textTransform:"capitalize"
          }}>{v==="check" ? "Today" : "History"}</button>
        ))}
      </div>

      {/* Privacy notice */}
      <div style={{ background:"#0f172a", borderRadius:"10px", padding:"0.6rem 1rem", marginBottom:"1.2rem", display:"flex", gap:"0.5rem", alignItems:"center" }}>
        <span>🔒</span>
        <span style={{ fontSize:"0.72rem", color:"#475569" }}>Your data stays on this device unless you choose to export it.</span>
      </div>

      {/* === TODAY VIEW === */}
      {view === "check" && !alreadyDone && (
        <div>
          {/* Progress */}
          <div style={{ display:"flex", gap:"4px", marginBottom:"1.5rem" }}>
            {[1,2,3,4,5].map(i => (
              <div key={i} style={{ flex:1, height:"4px", borderRadius:"2px", background: i<=step ? "#818cf8" : "#1e293b", transition:"background 0.3s" }} />
            ))}
          </div>

          <div className="card">
            {step===1 && <div className="fade-in">
              <p style={qLabel}>How was your overall mood today?</p>
              <Slider label="Mood" value={mood} onChange={setMood} low="Very Low" high="Excellent" emoji={moodEmoji} />
            </div>}
            {step===2 && <div className="fade-in">
              <p style={qLabel}>How stressed did you feel today?</p>
              <Slider label="Stress" value={stress} onChange={setStress} low="Not stressed" high="Extremely" emoji={v=>["😌","😌","😌","😐","😬","😬","😰","😰","🤯","🤯"][v-1]} />
            </div>}
            {step===3 && <div className="fade-in">
              <p style={qLabel}>How was your energy level today?</p>
              <Slider label="Energy" value={energy} onChange={setEnergy} low="Exhausted" high="Energized" emoji={v=>["🪫","🪫","😴","😴","😐","😐","⚡","⚡","🔥","🔥"][v-1]} />
            </div>}
            {step===4 && <div className="fade-in">
              <p style={qLabel}>How well did you sleep last night?</p>
              <Slider label="Sleep" value={sleep} onChange={setSleep} low="Terrible" high="Great" emoji={v=>["😫","😫","😪","😪","😶","😶","😴","😴","💤","💤"][v-1]} />
            </div>}
            {step===5 && <div className="fade-in">
              <p style={qLabel}>Did you feel supported or connected today?</p>
              <Slider label="Social" value={social} onChange={setSocial} low="Very alone" high="Very supported" emoji={v=>["😔","😔","😶","😶","🙂","🙂","🤝","🤝","🫂","🫂"][v-1]} />

              {/* Optional section */}
              <div style={{ borderTop:"1px solid #1e293b", paddingTop:"1.2rem", marginTop:"0.5rem" }}>
                <p style={{ color:"#475569", fontSize:"0.75rem", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:"0.8rem" }}>Optional — What influenced today?</p>
                <div style={{ display:"flex", flexWrap:"wrap", gap:"0.4rem", marginBottom:"1rem" }}>
                  {TAGS.map(t => (
                    <button key={t} onClick={() => toggleTag(t)} style={{
                      padding:"0.3rem 0.8rem", borderRadius:"20px", border:"1px solid",
                      borderColor: tags.includes(t) ? "#818cf8" : "#1e293b",
                      background: tags.includes(t) ? "#818cf820" : "transparent",
                      color: tags.includes(t) ? "#818cf8" : "#475569",
                      fontSize:"0.78rem", cursor:"pointer", transition:"all 0.15s"
                    }}>{t}</button>
                  ))}
                </div>
                <input
                  maxLength={20} value={word} onChange={e=>setWord(e.target.value)}
                  placeholder="One word to describe today… (optional)"
                  style={{
                    width:"100%", background:"#0f172a", border:"1px solid #1e293b",
                    borderRadius:"8px", padding:"0.6rem 0.8rem", color:"#e2e8f0",
                    fontSize:"0.85rem", outline:"none", boxSizing:"border-box"
                  }}
                />
              </div>
            </div>}

            <div style={{ display:"flex", gap:"0.8rem", marginTop:"1.2rem" }}>
              {step > 1 && <button onClick={() => setStep(s=>s-1)} style={btnSecondary}>← Back</button>}
              {step < 5
                ? <button onClick={() => setStep(s=>s+1)} style={btnPrimary}>Next →</button>
                : <button onClick={submit} style={{...btnPrimary, background:"linear-gradient(135deg,#818cf8,#a78bfa)"}}>Submit ✓</button>
              }
            </div>
          </div>
        </div>
      )}

      {/* === SUMMARY VIEW === */}
      {(view === "check" && alreadyDone || view === "summary") && todayEntry && (
        <div>
          <div className="card" style={{ textAlign:"center", marginBottom:"1rem" }}>
            {risk && (
              <div style={{ background:"#ff444420", border:"1px solid #f87171", borderRadius:"10px", padding:"0.6rem", marginBottom:"1rem", fontSize:"0.82rem", color:"#f87171" }}>
                ⚠️ Burnout risk detected — please take care of yourself today.
              </div>
            )}
            <p style={{ color:"#475569", fontSize:"0.75rem", textTransform:"uppercase", letterSpacing:"0.08em", margin:"0 0 0.5rem" }}>Today's Wellness Score</p>
            <div style={{ fontSize:"3.5rem", fontFamily:"'Playfair Display',serif", color: scoreColor(wellnessScore(todayEntry)), fontWeight:700, lineHeight:1 }}>
              {wellnessScore(todayEntry)}<span style={{ fontSize:"1.2rem", color:"#475569" }}>/10</span>
            </div>
            <div style={{ fontSize:"2rem", marginTop:"0.5rem" }}>{moodEmoji(todayEntry.mood)}</div>
            {todayEntry.word && <p style={{ color:"#818cf8", fontStyle:"italic", marginTop:"0.3rem", fontSize:"0.9rem" }}>"{todayEntry.word}"</p>}
          </div>

          {/* Breakdown */}
          <div className="card" style={{ marginBottom:"1rem" }}>
            <p style={{ color:"#475569", fontSize:"0.72rem", textTransform:"uppercase", letterSpacing:"0.08em", margin:"0 0 0.8rem" }}>Today's Breakdown</p>
            {[["Mood",todayEntry.mood,"😊"],["Stress",todayEntry.stress,"😬"],["Energy",todayEntry.energy,"⚡"],["Sleep",todayEntry.sleep,"💤"],["Social",todayEntry.social,"🤝"]].map(([lbl,val,em])=>(
              <div key={lbl} style={{ display:"flex", alignItems:"center", gap:"0.6rem", marginBottom:"0.6rem" }}>
                <span style={{ width:"20px", textAlign:"center" }}>{em}</span>
                <span style={{ flex:1, fontSize:"0.8rem", color:"#94a3b8" }}>{lbl}</span>
                <div style={{ flex:3, height:"6px", background:"#1e293b", borderRadius:"3px", overflow:"hidden" }}>
                  <div style={{ width:`${(val/10)*100}%`, height:"100%", background:"#818cf8", borderRadius:"3px", transition:"width 0.5s" }} />
                </div>
                <span style={{ width:"24px", textAlign:"right", fontSize:"0.8rem", color:"#818cf8", fontWeight:600 }}>{val}</span>
              </div>
            ))}
          </div>

          {/* Insights */}
          {entries.length > 1 && (
            <div className="card" style={{ marginBottom:"1rem" }}>
              <p style={{ color:"#475569", fontSize:"0.72rem", textTransform:"uppercase", letterSpacing:"0.08em", margin:"0 0 0.8rem" }}>Insights</p>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.8rem" }}>
                {[
                  ["Mood Volatility", `${volatility} σ`, "last 7 days"],
                  ["Stress-Sleep Corr.", corr !== null ? corr : "—", "across all days"],
                  ["Entries", entries.length, "days tracked"],
                ].map(([label, val, sub]) => (
                  <div key={label} style={{ background:"#0f172a", borderRadius:"10px", padding:"0.8rem" }}>
                    <div style={{ fontSize:"1.3rem", color:"#818cf8", fontWeight:700 }}>{val}</div>
                    <div style={{ fontSize:"0.72rem", color:"#e2e8f0", marginTop:"0.1rem" }}>{label}</div>
                    <div style={{ fontSize:"0.65rem", color:"#475569" }}>{sub}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {alreadyDone && (
            <p style={{ textAlign:"center", color:"#475569", fontSize:"0.78rem", marginBottom:"1rem" }}>✅ You've already checked in today. See you tomorrow!</p>
          )}
        </div>
      )}

      {/* === HISTORY VIEW === */}
      {view === "history" && (
        <div>
          {entries.length === 0 ? (
            <div className="card" style={{ textAlign:"center", color:"#475569" }}>
              <p>No entries yet.</p><p style={{ fontSize:"0.8rem" }}>Complete your first check-in!</p>
            </div>
          ) : (
            entries.slice().reverse().map(e => {
              const ws = wellnessScore(e);
              return (
                <div key={e.date} className="card" style={{ marginBottom:"0.8rem" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <span style={{ fontFamily:"'Playfair Display',serif", color:"#e2e8f0", fontSize:"0.9rem" }}>{e.date}</span>
                    <div style={{ display:"flex", alignItems:"center", gap:"0.4rem" }}>
                      {e.word && <span style={{ color:"#475569", fontSize:"0.75rem", fontStyle:"italic" }}>"{e.word}"</span>}
                      <span style={{ fontWeight:700, color: scoreColor(ws), fontSize:"1rem" }}>{ws}/10</span>
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:"0.5rem", marginTop:"0.6rem", fontSize:"0.75rem" }}>
                    {[["😊",e.mood],["😬",e.stress],["⚡",e.energy],["💤",e.sleep],["🤝",e.social]].map(([em,v],i) => (
                      <span key={i} style={{ background:"#0f172a", borderRadius:"6px", padding:"2px 6px", color:"#94a3b8" }}>{em}{v}</span>
                    ))}
                  </div>
                  {e.tags?.length > 0 && (
                    <div style={{ display:"flex", flexWrap:"wrap", gap:"4px", marginTop:"0.5rem" }}>
                      {e.tags.map(t => <span key={t} style={{ background:"#818cf820", color:"#818cf8", borderRadius:"10px", padding:"2px 8px", fontSize:"0.7rem" }}>{t}</span>)}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Actions */}
      <div style={{ display:"flex", gap:"0.6rem", marginTop:"1.2rem" }}>
        <button onClick={exportJSON} style={{ flex:1, ...btnSecondary, fontSize:"0.75rem" }}>⬇ Export JSON</button>
        <button onClick={clearAll} style={{ flex:1, padding:"0.55rem", border:"1px solid #ef4444", borderRadius:"10px", background:"transparent", color:"#ef4444", fontSize:"0.75rem", cursor:"pointer", fontWeight:600 }}>🗑 Clear All</button>
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const outerStyle = {
  minHeight:"100vh", background:"#0b1120",
  display:"flex", flexDirection:"column", alignItems:"center",
  padding:"2rem 1rem",
  fontFamily:"system-ui, sans-serif",
};

const qLabel = {
  fontFamily:"'Playfair Display',serif", color:"#e2e8f0",
  fontSize:"1.05rem", marginBottom:"1.2rem", lineHeight:1.5, margin:"0 0 1.2rem"
};

const btnPrimary = {
  flex:1, padding:"0.65rem", border:"none", borderRadius:"10px",
  background:"#818cf8", color:"#0f172a", fontWeight:700,
  fontSize:"0.9rem", cursor:"pointer"
};
const btnSecondary = {
  flex:1, padding:"0.55rem", border:"1px solid #1e293b", borderRadius:"10px",
  background:"transparent", color:"#64748b", fontSize:"0.85rem", cursor:"pointer"
};

const css = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&display=swap');
* { box-sizing: border-box; }
body { margin:0; background:#0b1120; }
input[type=range]::-webkit-slider-thumb {
  appearance:none; width:18px; height:18px;
  border-radius:50%; background:#818cf8;
  cursor:pointer; border:2px solid #0f172a;
  box-shadow: 0 0 0 3px #818cf820;
}
input[type=range]::-moz-range-thumb {
  width:16px; height:16px; border-radius:50%;
  background:#818cf8; cursor:pointer; border:2px solid #0f172a;
}
.card {
  background:#131f35; border-radius:16px;
  padding:1.2rem 1.2rem; width:100%; max-width:420px;
  box-shadow: 0 4px 24px #00000040;
}
.fade-in { animation: fadeIn 0.25s ease; }
@keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
`;
