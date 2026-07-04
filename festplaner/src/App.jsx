import React, { useState, useEffect, useCallback } from "react";
import { supabase, configured } from "./supabase.js";

/* ============================================================
   Landjugend Festplaner – Live-Version (Supabase + Netlify)
   Farben: Landjugend Österreich (Grün / Orange)
   ============================================================ */

const C = {
  green: "#94C11F",
  greenDark: "#5A7A12",
  greenDeep: "#33470B",
  orange: "#F39200",
  orangeSoft: "#FDEBD0",
  paper: "#FAFAF5",
  card: "#FFFFFF",
  ink: "#26301B",
  inkSoft: "#6B7360",
  line: "#E4E7DC",
  greenTint: "#F0F6DF",
};

const DAYS = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
const NEXT_DAY = {
  Montag: "Dienstag", Dienstag: "Mittwoch", Mittwoch: "Donnerstag",
  Donnerstag: "Freitag", Freitag: "Samstag", Samstag: null,
};
const SLOTS = [["vormittag", "Vormittag"], ["nachmittag", "Nachmittag"]];
const ME_KEY = "ljfest_me";

const timeStamp = () =>
  new Date().toLocaleString("de-AT", { weekday: "short", hour: "2-digit", minute: "2-digit" });

/* ---------- kleine Bausteine ---------- */

const Badge = ({ children, tone = "green" }) => (
  <span style={{
    display: "inline-flex", alignItems: "center", gap: 4,
    fontSize: 11, fontWeight: 800, letterSpacing: 0.3,
    padding: "3px 8px", borderRadius: 999,
    background: tone === "orange" ? C.orangeSoft : C.greenTint,
    color: tone === "orange" ? "#9A5C00" : C.greenDark,
  }}>{children}</span>
);

const Ring = ({ pct, size = 40, active }) => {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} style={{ display: "block" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={active ? "rgba(255,255,255,.35)" : C.line} strokeWidth="4" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={active ? "#fff" : C.green} strokeWidth="4"
        strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
        strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset .4s ease" }} />
    </svg>
  );
};

const BigBtn = ({ children, onClick, tone = "green", style }) => (
  <button onClick={onClick} style={{
    border: "none", cursor: "pointer", fontFamily: "inherit",
    fontWeight: 800, fontSize: 15, borderRadius: 14, padding: "13px 18px",
    background: tone === "green" ? C.green : tone === "orange" ? C.orange : C.greenTint,
    color: tone === "ghost" ? C.greenDark : "#fff",
    width: "100%", ...style,
  }}>{children}</button>
);

/* ---------- Haupt-App ---------- */

export default function App() {
  const [me, setMe] = useState(() => {
    try { return localStorage.getItem(ME_KEY); } catch { return null; }
  });
  const [tasks, setTasks] = useState([]);
  const [stores, setStores] = useState([]);
  const [items, setItems] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);
  const [tab, setTab] = useState("aufgaben");
  const [day, setDay] = useState("Montag");
  const [openNotes, setOpenNotes] = useState({});
  const [assignFor, setAssignFor] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  };

  /* ---- Laden ---- */
  const loadTasks = useCallback(async () => {
    const { data } = await supabase.from("tasks").select("*").order("created_at");
    if (data) setTasks(data);
  }, []);
  const loadShopping = useCallback(async () => {
    const [s, i] = await Promise.all([
      supabase.from("stores").select("*").order("created_at"),
      supabase.from("store_items").select("*").order("created_at"),
    ]);
    if (s.data) setStores(s.data);
    if (i.data) setItems(i.data);
  }, []);
  const loadVehicles = useCallback(async () => {
    const [v, b] = await Promise.all([
      supabase.from("vehicles").select("*").order("created_at"),
      supabase.from("vehicle_bookings").select("*"),
    ]);
    if (v.data) setVehicles(v.data);
    if (b.data) setBookings(b.data);
  }, []);
  const loadUsers = useCallback(async () => {
    const { data } = await supabase.from("users").select("*").order("name");
    if (data) setUsers(data.map((u) => u.name));
  }, []);

  useEffect(() => {
    if (!configured) { setLoading(false); return; }
    (async () => {
      await Promise.all([loadTasks(), loadShopping(), loadVehicles(), loadUsers()]);
      setLoading(false);
    })();

    /* ---- Live-Abgleich: bei jeder Änderung neu laden ---- */
    const ch = supabase
      .channel("ljfest-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, loadTasks)
      .on("postgres_changes", { event: "*", schema: "public", table: "stores" }, loadShopping)
      .on("postgres_changes", { event: "*", schema: "public", table: "store_items" }, loadShopping)
      .on("postgres_changes", { event: "*", schema: "public", table: "vehicles" }, loadVehicles)
      .on("postgres_changes", { event: "*", schema: "public", table: "vehicle_bookings" }, loadVehicles)
      .on("postgres_changes", { event: "*", schema: "public", table: "users" }, loadUsers)
      .subscribe((status) => setLive(status === "SUBSCRIBED"));

    return () => { supabase.removeChannel(ch); };
  }, [loadTasks, loadShopping, loadVehicles, loadUsers]);

  /* ---- Anmeldung: Name bleibt am Gerät gespeichert ---- */
  const login = async (name) => {
    const clean = name.trim();
    if (!clean) return;
    setMe(clean);
    try { localStorage.setItem(ME_KEY, clean); } catch {}
    await supabase.from("users").upsert({ name: clean });
    loadUsers();
  };
  const logout = () => {
    setMe(null);
    try { localStorage.removeItem(ME_KEY); } catch {}
  };

  /* ---- Aufgaben ---- */
  const toggleTask = async (t) => {
    const patch = t.done
      ? { done: false, done_by: null, done_at: null }
      : { done: true, done_by: me, done_at: timeStamp() };
    setTasks((prev) => prev.map((x) => (x.id === t.id ? { ...x, ...patch } : x)));
    const { error } = await supabase.from("tasks").update(patch).eq("id", t.id);
    if (error) { showToast("Speichern fehlgeschlagen"); loadTasks(); }
  };

  const setTaskNote = async (id, notes) => {
    setTasks((prev) => prev.map((x) => (x.id === id ? { ...x, notes } : x)));
    await supabase.from("tasks").update({ notes }).eq("id", id);
  };

  const assignTask = async (id, person) => {
    setAssignFor(null);
    setTasks((prev) => prev.map((x) => (x.id === id ? { ...x, assigned_to: person } : x)));
    await supabase.from("tasks").update({ assigned_to: person }).eq("id", id);
  };

  const addTask = async (title) => {
    if (!title.trim()) return;
    const { error } = await supabase.from("tasks").insert({ day, title: title.trim() });
    if (error) showToast("Konnte Aufgabe nicht anlegen");
    loadTasks();
  };

  const moveUnfinished = async () => {
    const target = NEXT_DAY[day];
    if (!target) return;
    const open = tasks.filter((t) => t.day === day && !t.done);
    if (!open.length) { showToast("Alles erledigt – nichts zu verschieben"); return; }
    await supabase.from("tasks")
      .update({ day: target, moved_from: day })
      .eq("day", day).eq("done", false);
    loadTasks();
    showToast(`${open.length} Aufgabe${open.length > 1 ? "n" : ""} auf ${target} verschoben`);
  };

  /* ---- Einkauf ---- */
  const addStore = async (name) => {
    if (!name.trim()) return;
    await supabase.from("stores").insert({ name: name.trim() });
    loadShopping();
  };
  const addItem = async (storeId, text) => {
    if (!text.trim()) return;
    await supabase.from("store_items").insert({ store_id: storeId, text: text.trim() });
    loadShopping();
  };
  const toggleItem = async (item) => {
    const patch = item.done ? { done: false, done_by: null } : { done: true, done_by: me };
    setItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, ...patch } : x)));
    await supabase.from("store_items").update(patch).eq("id", item.id);
  };

  /* ---- Fahrzeuge ---- */
  const toggleBooking = async (vehicleId, d, slot) => {
    const existing = bookings.find((b) => b.vehicle_id === vehicleId && b.day === d && b.slot === slot);
    if (existing) {
      if (existing.booked_by !== me) { showToast(`Belegt von ${existing.booked_by}`); return; }
      setBookings((prev) => prev.filter((b) => b.id !== existing.id));
      await supabase.from("vehicle_bookings").delete().eq("id", existing.id);
    } else {
      const { error } = await supabase.from("vehicle_bookings")
        .insert({ vehicle_id: vehicleId, day: d, slot, booked_by: me });
      if (error) showToast("Gerade von jemand anderem reserviert");
    }
    loadVehicles();
  };
  const addVehicle = async (name) => {
    if (!name.trim()) return;
    await supabase.from("vehicles").insert({ name: name.trim() });
    loadVehicles();
  };

  /* ---------- Render ---------- */

  const shell = (inner) => (
    <div style={{
      fontFamily: "'Nunito', 'Segoe UI', system-ui, sans-serif",
      background: C.paper, minHeight: "100vh", color: C.ink,
      maxWidth: 480, margin: "0 auto", position: "relative",
    }}>
      <style>{`
        * { box-sizing: border-box; }
        input, textarea { font-family: inherit; }
        button:focus-visible, input:focus-visible { outline: 3px solid ${C.orange}; outline-offset: 2px; }
        @media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
      `}</style>
      {inner}
      {toast && (
        <div style={{
          position: "fixed", bottom: 90, left: "50%", transform: "translateX(-50%)",
          background: C.ink, color: "#fff", padding: "10px 18px", borderRadius: 12,
          fontSize: 14, fontWeight: 700, zIndex: 60, maxWidth: 320, textAlign: "center",
        }}>{toast}</div>
      )}
    </div>
  );

  if (!configured) return shell(
    <div style={{ padding: 40 }}>
      <h1 style={{ fontSize: 22, fontWeight: 900 }}>Supabase noch nicht verbunden</h1>
      <p style={{ fontWeight: 700, color: C.inkSoft, lineHeight: 1.5 }}>
        Lege die Umgebungsvariablen <code>VITE_SUPABASE_URL</code> und{" "}
        <code>VITE_SUPABASE_ANON_KEY</code> an (lokal in <code>.env</code>, auf Netlify unter
        „Site settings → Environment variables") und baue die Seite neu. Die Schritt-für-Schritt-Anleitung
        steht in <code>ANLEITUNG.md</code>.
      </p>
    </div>
  );

  if (loading) return shell(
    <div style={{ padding: 60, textAlign: "center", color: C.inkSoft, fontWeight: 700 }}>Lade Festplaner …</div>
  );

  if (!me) return shell(<LoginScreen users={users} onLogin={login} />);

  const dayTasks = tasks.filter((t) => t.day === day);
  const doneCount = dayTasks.filter((t) => t.done).length;

  return shell(
    <>
      <header style={{
        background: `linear-gradient(135deg, ${C.greenDark}, ${C.green})`,
        padding: "18px 18px 14px", color: "#fff",
        borderRadius: "0 0 24px 24px",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", opacity: 0.85 }}>
              Landjugend · Festwoche {live ? "· 🟢 live" : ""}
            </div>
            <div style={{ fontSize: 24, fontWeight: 900, lineHeight: 1.1 }}>Festplaner</div>
          </div>
          <button onClick={logout} style={{
            background: "rgba(255,255,255,.18)", border: "none", color: "#fff",
            borderRadius: 999, padding: "7px 14px", fontWeight: 800, fontSize: 13,
            cursor: "pointer", fontFamily: "inherit",
          }}>
            {me} · Abmelden
          </button>
        </div>

        {tab === "aufgaben" && (
          <div style={{ display: "flex", gap: 6, marginTop: 14, overflowX: "auto", paddingBottom: 4 }}>
            {DAYS.map((d) => {
              const list = tasks.filter((t) => t.day === d);
              const pct = list.length ? list.filter((t) => t.done).length / list.length : 0;
              const active = d === day;
              return (
                <button key={d} onClick={() => setDay(d)} style={{
                  flex: "0 0 auto", border: "none", cursor: "pointer", fontFamily: "inherit",
                  background: active ? "rgba(255,255,255,.22)" : "transparent",
                  borderRadius: 14, padding: "8px 10px", color: "#fff",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                }}>
                  <div style={{ position: "relative" }}>
                    <Ring pct={pct} active={active} />
                    <div style={{
                      position: "absolute", inset: 0, display: "flex",
                      alignItems: "center", justifyContent: "center",
                      fontSize: 12, fontWeight: 900,
                    }}>{d.slice(0, 2)}</div>
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 800, opacity: active ? 1 : 0.75 }}>
                    {list.filter((t) => t.done).length}/{list.length}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </header>

      <main style={{ padding: "16px 16px 110px" }}>
        {tab === "aufgaben" && (
          <TasksView
            day={day} tasks={dayTasks} me={me} users={users}
            doneCount={doneCount}
            onToggle={toggleTask} onNote={setTaskNote}
            openNotes={openNotes} setOpenNotes={setOpenNotes}
            assignFor={assignFor} setAssignFor={setAssignFor}
            onAssign={assignTask} onAdd={addTask}
            onMove={NEXT_DAY[day] ? moveUnfinished : null} nextDay={NEXT_DAY[day]}
          />
        )}
        {tab === "einkauf" && (
          <ShoppingView stores={stores} items={items}
            onAddStore={addStore} onAddItem={addItem} onToggle={toggleItem} />
        )}
        {tab === "fahrzeuge" && (
          <VehiclesView vehicles={vehicles} bookings={bookings} me={me}
            onToggle={toggleBooking} onAdd={addVehicle} />
        )}
      </main>

      <nav style={{
        position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: 480, background: C.card,
        borderTop: `1px solid ${C.line}`, display: "flex", zIndex: 50,
        boxShadow: "0 -4px 20px rgba(38,48,27,.08)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}>
        {[
          ["aufgaben", "✅", "Aufgaben"],
          ["einkauf", "🛒", "Einkauf"],
          ["fahrzeuge", "🚜", "Fahrzeuge"],
        ].map(([key, icon, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{
            flex: 1, border: "none", background: "none", cursor: "pointer",
            padding: "10px 0 14px", fontFamily: "inherit",
            color: tab === key ? C.greenDark : C.inkSoft,
            fontWeight: tab === key ? 900 : 700, fontSize: 12,
            borderTop: tab === key ? `3px solid ${C.green}` : "3px solid transparent",
          }}>
            <div style={{ fontSize: 20 }}>{icon}</div>
            {label}
          </button>
        ))}
      </nav>
    </>
  );
}

/* ---------- Anmeldung ---------- */

function LoginScreen({ users, onLogin }) {
  const [name, setName] = useState("");
  return (
    <div style={{ padding: "56px 24px 40px", textAlign: "center" }}>
      <div style={{
        width: 84, height: 84, borderRadius: 28, margin: "0 auto 18px",
        background: `linear-gradient(135deg, ${C.green}, ${C.greenDark})`,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40,
        boxShadow: `0 10px 30px ${C.green}55`,
      }}>🎉</div>
      <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 2.5, textTransform: "uppercase", color: C.orange }}>
        Landjugend
      </div>
      <h1 style={{ fontSize: 30, fontWeight: 900, margin: "4px 0 8px" }}>Festplaner</h1>
      <p style={{ color: C.inkSoft, fontWeight: 700, margin: "0 0 28px" }}>
        Gib deinen Namen ein – mehr brauchst du nicht.
      </p>

      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onLogin(name)}
        placeholder="Dein Name"
        style={{
          width: "100%", padding: "15px 16px", fontSize: 17, fontWeight: 700,
          borderRadius: 14, border: `2px solid ${C.line}`, marginBottom: 12,
          background: "#fff",
        }}
      />
      <BigBtn onClick={() => onLogin(name)}>Los geht's</BigBtn>

      {users.length > 0 && (
        <div style={{ marginTop: 30, textAlign: "left" }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: C.inkSoft, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>
            Schon dabei gewesen? Tipp auf deinen Namen:
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {users.map((u) => (
              <button key={u} onClick={() => onLogin(u)} style={{
                border: `2px solid ${C.green}`, background: C.greenTint, color: C.greenDeep,
                borderRadius: 999, padding: "9px 16px", fontWeight: 800, fontSize: 14,
                cursor: "pointer", fontFamily: "inherit",
              }}>{u}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Aufgaben ---------- */

function TasksView({ day, tasks, me, users, doneCount, onToggle, onNote, openNotes, setOpenNotes, assignFor, setAssignFor, onAssign, onAdd, onMove, nextDay }) {
  const [newTask, setNewTask] = useState("");
  const open = tasks.filter((t) => !t.done);
  const done = tasks.filter((t) => t.done);

  const TaskCard = ({ t }) => (
    <div style={{
      background: C.card, borderRadius: 16, padding: "12px 14px",
      border: `1px solid ${C.line}`, marginBottom: 10,
      opacity: t.done ? 0.65 : 1,
    }}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <button onClick={() => onToggle(t)} aria-label={t.done ? "Als offen markieren" : "Als erledigt markieren"} style={{
          width: 28, height: 28, borderRadius: 9, flexShrink: 0, cursor: "pointer",
          border: t.done ? "none" : `2.5px solid ${C.green}`,
          background: t.done ? C.green : "#fff",
          color: "#fff", fontSize: 16, fontWeight: 900, lineHeight: 1,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>{t.done ? "✓" : ""}</button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontWeight: 800, fontSize: 15, lineHeight: 1.3,
            textDecoration: t.done ? "line-through" : "none",
          }}>{t.title}</div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 7, alignItems: "center" }}>
            {t.moved_from && <Badge tone="orange">⏩ verschoben von {t.moved_from}</Badge>}
            <button onClick={() => setAssignFor(assignFor === t.id ? null : t.id)} style={{
              border: "none", cursor: "pointer", fontFamily: "inherit",
              fontSize: 11, fontWeight: 800, padding: "3px 8px", borderRadius: 999,
              background: t.assigned_to ? C.greenTint : "#F1F1EC",
              color: t.assigned_to ? C.greenDark : C.inkSoft,
            }}>
              👤 {t.assigned_to || "Wer macht's?"}
            </button>
            <button onClick={() => setOpenNotes((o) => ({ ...o, [t.id]: !o[t.id] }))} style={{
              border: "none", cursor: "pointer", fontFamily: "inherit",
              fontSize: 11, fontWeight: 800, padding: "3px 8px", borderRadius: 999,
              background: t.notes ? C.orangeSoft : "#F1F1EC",
              color: t.notes ? "#9A5C00" : C.inkSoft,
            }}>
              📝 {t.notes ? "Notiz" : "Notiz hinzufügen"}
            </button>
          </div>

          {assignFor === t.id && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
              <button onClick={() => onAssign(t.id, me)} style={{
                border: "none", background: C.green, color: "#fff", borderRadius: 999,
                padding: "6px 12px", fontWeight: 800, fontSize: 12, cursor: "pointer", fontFamily: "inherit",
              }}>Ich mach's ({me})</button>
              {users.filter((u) => u !== me).map((u) => (
                <button key={u} onClick={() => onAssign(t.id, u)} style={{
                  border: `1.5px solid ${C.line}`, background: "#fff", color: C.ink,
                  borderRadius: 999, padding: "6px 12px", fontWeight: 700, fontSize: 12,
                  cursor: "pointer", fontFamily: "inherit",
                }}>{u}</button>
              ))}
              {t.assigned_to && (
                <button onClick={() => onAssign(t.id, null)} style={{
                  border: "none", background: "#F1F1EC", color: C.inkSoft, borderRadius: 999,
                  padding: "6px 12px", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit",
                }}>Zuordnung entfernen</button>
              )}
            </div>
          )}

          {openNotes[t.id] && (
            <textarea
              defaultValue={t.notes || ""}
              onBlur={(e) => onNote(t.id, e.target.value)}
              placeholder="Notiz zu dieser Aufgabe …"
              rows={2}
              style={{
                width: "100%", marginTop: 8, borderRadius: 10, border: `1.5px solid ${C.line}`,
                padding: "8px 10px", fontSize: 13, fontWeight: 600, resize: "vertical",
              }}
            />
          )}
          {!openNotes[t.id] && t.notes && (
            <div style={{ marginTop: 6, fontSize: 12.5, color: C.inkSoft, fontWeight: 600 }}>📝 {t.notes}</div>
          )}

          {t.done && (
            <div style={{ marginTop: 6, fontSize: 11.5, fontWeight: 800, color: C.greenDark }}>
              ✓ Erledigt von {t.done_by} · {t.done_at}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
        <h2 style={{ fontSize: 21, fontWeight: 900, margin: 0 }}>{day}</h2>
        <span style={{ fontSize: 13, fontWeight: 800, color: C.inkSoft }}>
          {doneCount} von {tasks.length} erledigt
        </span>
      </div>

      {open.length === 0 && done.length > 0 && (
        <div style={{
          background: C.greenTint, borderRadius: 16, padding: 16, marginBottom: 14,
          fontWeight: 800, color: C.greenDeep, textAlign: "center",
        }}>🎉 Alles erledigt – super Arbeit!</div>
      )}

      {open.map((t) => <TaskCard key={t.id} t={t} />)}

      <div style={{ display: "flex", gap: 8, margin: "14px 0" }}>
        <input
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { onAdd(newTask); setNewTask(""); } }}
          placeholder={`Neue Aufgabe für ${day} …`}
          style={{
            flex: 1, padding: "12px 14px", borderRadius: 14, border: `2px solid ${C.line}`,
            fontSize: 14, fontWeight: 700, background: "#fff",
          }}
        />
        <button onClick={() => { onAdd(newTask); setNewTask(""); }} style={{
          border: "none", background: C.green, color: "#fff", borderRadius: 14,
          width: 48, fontSize: 24, fontWeight: 900, cursor: "pointer", fontFamily: "inherit",
        }}>+</button>
      </div>

      {onMove && open.length > 0 && (
        <BigBtn tone="orange" onClick={onMove} style={{ marginBottom: 18 }}>
          ⏩ Unerledigtes auf {nextDay} verschieben
        </BigBtn>
      )}

      {done.length > 0 && (
        <>
          <div style={{ fontSize: 12, fontWeight: 800, color: C.inkSoft, textTransform: "uppercase", letterSpacing: 1, margin: "18px 0 8px" }}>
            Erledigt
          </div>
          {done.map((t) => <TaskCard key={t.id} t={t} />)}
        </>
      )}
    </>
  );
}

/* ---------- Einkauf ---------- */

function ShoppingView({ stores, items, onAddStore, onAddItem, onToggle }) {
  const [newStore, setNewStore] = useState("");
  const [drafts, setDrafts] = useState({});

  return (
    <>
      <h2 style={{ fontSize: 21, fontWeight: 900, margin: "0 0 4px" }}>Einkaufsliste</h2>
      <p style={{ color: C.inkSoft, fontWeight: 700, fontSize: 13, margin: "0 0 16px" }}>
        Nach Geschäft gruppiert – alle sehen live dieselbe Liste.
      </p>

      {stores.map((s) => {
        const list = items.filter((i) => i.store_id === s.id);
        const openItems = list.filter((i) => !i.done);
        const doneItems = list.filter((i) => i.done);
        return (
          <div key={s.id} style={{
            background: C.card, borderRadius: 18, border: `1px solid ${C.line}`,
            padding: "14px 14px 12px", marginBottom: 14,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontWeight: 900, fontSize: 16 }}>🏪 {s.name}</div>
              <Badge>{openItems.length} offen</Badge>
            </div>

            {[...openItems, ...doneItems].map((i) => (
              <button key={i.id} onClick={() => onToggle(i)} style={{
                display: "flex", alignItems: "center", gap: 10, width: "100%",
                border: "none", background: "none", cursor: "pointer", fontFamily: "inherit",
                padding: "7px 2px", textAlign: "left",
              }}>
                <span style={{
                  width: 22, height: 22, borderRadius: 7, flexShrink: 0,
                  border: i.done ? "none" : `2.5px solid ${C.green}`,
                  background: i.done ? C.green : "#fff", color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 13, fontWeight: 900,
                }}>{i.done ? "✓" : ""}</span>
                <span style={{
                  fontWeight: 700, fontSize: 14, color: i.done ? C.inkSoft : C.ink,
                  textDecoration: i.done ? "line-through" : "none",
                }}>
                  {i.text}{i.done && i.done_by ? ` · ${i.done_by}` : ""}
                </span>
              </button>
            ))}

            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              <input
                value={drafts[s.id] || ""}
                onChange={(e) => setDrafts((d) => ({ ...d, [s.id]: e.target.value }))}
                onKeyDown={(e) => { if (e.key === "Enter") { onAddItem(s.id, drafts[s.id] || ""); setDrafts((d) => ({ ...d, [s.id]: "" })); } }}
                placeholder="Artikel hinzufügen …"
                style={{ flex: 1, padding: "9px 12px", borderRadius: 10, border: `1.5px solid ${C.line}`, fontSize: 13, fontWeight: 700 }}
              />
              <button onClick={() => { onAddItem(s.id, drafts[s.id] || ""); setDrafts((d) => ({ ...d, [s.id]: "" })); }} style={{
                border: "none", background: C.greenTint, color: C.greenDark, borderRadius: 10,
                width: 40, fontSize: 20, fontWeight: 900, cursor: "pointer", fontFamily: "inherit",
              }}>+</button>
            </div>
          </div>
        );
      })}

      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={newStore}
          onChange={(e) => setNewStore(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { onAddStore(newStore); setNewStore(""); } }}
          placeholder="Neues Geschäft (z. B. Lagerhaus) …"
          style={{ flex: 1, padding: "12px 14px", borderRadius: 14, border: `2px solid ${C.line}`, fontSize: 14, fontWeight: 700, background: "#fff" }}
        />
        <button onClick={() => { onAddStore(newStore); setNewStore(""); }} style={{
          border: "none", background: C.green, color: "#fff", borderRadius: 14,
          width: 48, fontSize: 24, fontWeight: 900, cursor: "pointer", fontFamily: "inherit",
        }}>+</button>
      </div>
    </>
  );
}

/* ---------- Fahrzeuge ---------- */

function VehiclesView({ vehicles, bookings, me, onToggle, onAdd }) {
  const [newVehicle, setNewVehicle] = useState("");
  const findBooking = (vId, d, slot) =>
    bookings.find((b) => b.vehicle_id === vId && b.day === d && b.slot === slot);

  return (
    <>
      <h2 style={{ fontSize: 21, fontWeight: 900, margin: "0 0 4px" }}>Fahrzeuge</h2>
      <p style={{ color: C.inkSoft, fontWeight: 700, fontSize: 13, margin: "0 0 16px" }}>
        Tipp auf Vormittag oder Nachmittag, um zu reservieren. Nochmal tippen gibt wieder frei.
      </p>

      {vehicles.map((v) => (
        <div key={v.id} style={{
          background: C.card, borderRadius: 18, border: `1px solid ${C.line}`,
          padding: 14, marginBottom: 14,
        }}>
          <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 10 }}>🚜 {v.name}</div>
          {DAYS.map((d) => (
            <div key={d} style={{ display: "grid", gridTemplateColumns: "64px 1fr 1fr", gap: 6, alignItems: "center", marginBottom: 6 }}>
              <div style={{ fontWeight: 800, fontSize: 12, color: C.inkSoft }}>{d.slice(0, 2)}</div>
              {SLOTS.map(([slot, label]) => {
                const b = findBooking(v.id, d, slot);
                const mine = b && b.booked_by === me;
                return (
                  <button key={slot} onClick={() => onToggle(v.id, d, slot)} style={{
                    border: b ? "none" : `2px dashed ${C.line}`,
                    background: mine ? C.green : b ? C.orangeSoft : "#fff",
                    color: mine ? "#fff" : b ? "#9A5C00" : C.inkSoft,
                    borderRadius: 10, padding: "7px 4px", cursor: "pointer", fontFamily: "inherit",
                    fontWeight: 800, fontSize: 11, lineHeight: 1.25,
                  }}>
                    {label}<br />
                    <span style={{ fontSize: 10.5, fontWeight: 700 }}>
                      {mine ? "Deins ✓" : b ? b.booked_by : "frei"}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      ))}

      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={newVehicle}
          onChange={(e) => setNewVehicle(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { onAdd(newVehicle); setNewVehicle(""); } }}
          placeholder="Fahrzeug hinzufügen …"
          style={{ flex: 1, padding: "12px 14px", borderRadius: 14, border: `2px solid ${C.line}`, fontSize: 14, fontWeight: 700, background: "#fff" }}
        />
        <button onClick={() => { onAdd(newVehicle); setNewVehicle(""); }} style={{
          border: "none", background: C.green, color: "#fff", borderRadius: 14,
          width: 48, fontSize: 24, fontWeight: 900, cursor: "pointer", fontFamily: "inherit",
        }}>+</button>
      </div>
    </>
  );
}
