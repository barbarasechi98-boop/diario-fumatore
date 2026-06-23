import { useState, useEffect } from "react";

const STORAGE_KEY = "diario-fumatore-data";

// Usa la data LOCALE (non UTC) per evitare problemi di fuso orario
function getTodayKey() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatDate(dateKey) {
  const [y, m, d] = dateKey.split("-");
  return `${d}/${m}/${y}`;
}

const emptyRow = () => ({
  orario: "",
  conChi: "",
  dove: "",
  occupazione: "",
  statoAnimo: "",
  gradoBisogno: "5",
});

export default function DiarioFumatore() {
  const [view, setView] = useState("today");
  const [allData, setAllData] = useState({});
  const [selectedDay, setSelectedDay] = useState(null);
  const [editingRow, setEditingRow] = useState(null);
  const [draft, setDraft] = useState(emptyRow());
  const [todayKey] = useState(getTodayKey());

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setAllData(JSON.parse(saved));
    } catch {}
  }, []);

  const save = (newData) => {
    setAllData(newData);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
    } catch (e) {
      console.error("Storage error:", e);
    }
  };

  const todayRows = allData[todayKey] || [];

  const openAdd = () => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    setDraft({ ...emptyRow(), orario: `${hh}:${mm}` });
    setEditingRow({ dayKey: todayKey, index: -1 });
  };

  const openEdit = (dayKey, index) => {
    setDraft({ ...allData[dayKey][index] });
    setEditingRow({ dayKey, index });
  };

  const saveRow = () => {
    const { dayKey, index } = editingRow;
    const newData = { ...allData };
    if (!newData[dayKey]) newData[dayKey] = [];
    if (index === -1) {
      newData[dayKey] = [...newData[dayKey], draft];
    } else {
      newData[dayKey] = newData[dayKey].map((r, i) => (i === index ? draft : r));
    }
    save(newData);
    setEditingRow(null);
  };

  const deleteRow = (dayKey, index) => {
    const newData = { ...allData };
    newData[dayKey] = newData[dayKey].filter((_, i) => i !== index);
    if (newData[dayKey].length === 0) delete newData[dayKey];
    save(newData);
    if (view === "detail" && !newData[selectedDay]) setView("history");
  };

  const sortedDays = Object.keys(allData).sort().reverse();

  // ── FORM ──────────────────────────────────────────────────────
  if (editingRow) {
    const rowNum = editingRow.index === -1
      ? (allData[editingRow.dayKey]?.length || 0) + 1
      : editingRow.index + 1;

    return (
      <div style={S.page}>
        <div style={S.header}>
          <button style={S.backBtn} onClick={() => setEditingRow(null)}>✕ Annulla</button>
          <span style={S.headerTitle}>Sigaretta n. {rowNum}</span>
          <button style={{ ...S.backBtn, fontWeight: 700, color: "#007AFF" }} onClick={saveRow}>Salva</button>
        </div>
        <div style={S.formBody}>
          <Field label="Orario">
            <input type="time" style={S.input} value={draft.orario}
              onChange={e => setDraft({ ...draft, orario: e.target.value })} />
          </Field>
          <Field label="Con chi">
            <input type="text" placeholder="es. da solo, con colleghi…" style={S.input} value={draft.conChi}
              onChange={e => setDraft({ ...draft, conChi: e.target.value })} />
          </Field>
          <Field label="Dove" hint="Se in casa specifica in quale ambiente">
            <input type="text" placeholder="es. ufficio, cucina, balcone…" style={S.input} value={draft.dove}
              onChange={e => setDraft({ ...draft, dove: e.target.value })} />
          </Field>
          <Field label="Occupazione" hint="Cosa stavo facendo poco prima di fumare">
            <input type="text" placeholder="es. lavorando, guardando TV…" style={S.input} value={draft.occupazione}
              onChange={e => setDraft({ ...draft, occupazione: e.target.value })} />
          </Field>
          <Field label="Stato d'animo">
            <input type="text" placeholder="es. ansioso, rilassato, stressato…" style={S.input} value={draft.statoAnimo}
              onChange={e => setDraft({ ...draft, statoAnimo: e.target.value })} />
          </Field>
          <Field label="Grado di bisogno (0–10)">
            <div style={{ padding: "4px 0" }}>
              <input type="range" min="0" max="10" style={{ width: "100%", accentColor: "#007AFF" }}
                value={draft.gradoBisogno}
                onChange={e => setDraft({ ...draft, gradoBisogno: e.target.value })} />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#888" }}>
                <span>0 – nessuno</span>
                <span style={{ fontSize: 20, fontWeight: 700, color: "#007AFF" }}>{draft.gradoBisogno}</span>
                <span>10 – forte</span>
              </div>
            </div>
          </Field>
        </div>
      </div>
    );
  }

  // ── DETAIL ────────────────────────────────────────────────────
  if (view === "detail" && selectedDay) {
    const rows = allData[selectedDay] || [];
    return (
      <div style={S.page}>
        <div style={S.header}>
          <button style={S.backBtn} onClick={() => setView("history")}>← Indietro</button>
          <span style={S.headerTitle}>{formatDate(selectedDay)}</span>
          <span style={{ fontSize: 14, color: "#888" }}>{rows.length} sigarette</span>
        </div>
        <div style={S.listBody}>
          {rows.map((row, i) => (
            <RowCard key={i} row={row} num={i + 1}
              onEdit={() => openEdit(selectedDay, i)}
              onDelete={() => { if (window.confirm("Eliminare questa sigaretta?")) deleteRow(selectedDay, i); }} />
          ))}
          {rows.length === 0 && <div style={S.empty}>Nessuna sigaretta registrata</div>}
        </div>
      </div>
    );
  }

  // ── HISTORY ───────────────────────────────────────────────────
  if (view === "history") {
    return (
      <div style={S.page}>
        <div style={S.header}>
          <button style={S.backBtn} onClick={() => setView("today")}>← Oggi</button>
          <span style={S.headerTitle}>Storico</span>
          <span />
        </div>
        <div style={S.listBody}>
          {sortedDays.length === 0 && <div style={S.empty}>Nessun dato registrato</div>}
          {sortedDays.map(day => (
            <button key={day} style={S.dayCard} onClick={() => { setSelectedDay(day); setView("detail"); }}>
              <div style={{ fontWeight: 600, fontSize: 17 }}>{formatDate(day)}</div>
              <div style={{ color: "#555", marginTop: 2 }}>🚬 {allData[day].length} sigarette</div>
              <span style={S.arrow}>›</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── TODAY ─────────────────────────────────────────────────────
  return (
    <div style={S.page}>
      <div style={S.header}>
        <span style={S.headerTitle}>Diario del Fumatore</span>
        <button style={S.histBtn} onClick={() => setView("history")}>Storico</button>
      </div>
      <div style={{ padding: "12px 16px 4px", color: "#888", fontSize: 14 }}>
        Oggi · {formatDate(todayKey)} · {todayRows.length} sigarette
      </div>
      <div style={S.listBody}>
        {todayRows.map((row, i) => (
          <RowCard key={i} row={row} num={i + 1}
            onEdit={() => openEdit(todayKey, i)}
            onDelete={() => { if (window.confirm("Eliminare questa sigaretta?")) deleteRow(todayKey, i); }} />
        ))}
        {todayRows.length === 0 && (
          <div style={S.empty}>Nessuna sigaretta registrata oggi.<br />Premi + per aggiungerne una.</div>
        )}
      </div>
      <button style={S.fab} onClick={openAdd}>+</button>
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>{label}</div>
      {hint && <div style={{ fontSize: 12, color: "#888", marginBottom: 6 }}>{hint}</div>}
      {children}
    </div>
  );
}

function RowCard({ row, num, onEdit, onDelete }) {
  return (
    <div style={S.rowCard}>
      <div style={S.rowLeft}>
        <div style={S.rowNum}>#{num}</div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 16 }}>
            🕐 {row.orario || "–"}
            {row.gradoBisogno !== "" && (
              <span style={{ marginLeft: 10, fontSize: 14, color: "#007AFF" }}>
                Bisogno: {row.gradoBisogno}/10
              </span>
            )}
          </div>
          {row.dove && <div style={S.meta}>📍 {row.dove}</div>}
          {row.conChi && <div style={S.meta}>👤 {row.conChi}</div>}
          {row.occupazione && <div style={S.meta}>💼 {row.occupazione}</div>}
          {row.statoAnimo && <div style={S.meta}>💭 {row.statoAnimo}</div>}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <button style={S.editBtn} onClick={onEdit}>Modifica</button>
        <button style={S.delBtn} onClick={onDelete}>Elimina</button>
      </div>
    </div>
  );
}

const S = {
  page: { fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", background: "#F2F2F7", minHeight: "100vh", maxWidth: 480, margin: "0 auto", position: "relative", paddingBottom: 80 },
  header: { background: "#fff", borderBottom: "1px solid #E5E5EA", padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 10 },
  headerTitle: { fontWeight: 700, fontSize: 17 },
  backBtn: { background: "none", border: "none", fontSize: 15, color: "#007AFF", cursor: "pointer", padding: "4px 0" },
  histBtn: { background: "none", border: "none", fontSize: 15, color: "#007AFF", cursor: "pointer" },
  formBody: { padding: "20px 16px", background: "#fff", margin: "12px 0" },
  input: { width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #C7C7CC", fontSize: 16, boxSizing: "border-box", background: "#F9F9F9" },
  listBody: { padding: "8px 0" },
  rowCard: { background: "#fff", margin: "0 0 1px", padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 },
  rowLeft: { display: "flex", gap: 12, flex: 1 },
  rowNum: { fontSize: 13, color: "#8E8E93", fontWeight: 600, paddingTop: 2, minWidth: 26 },
  meta: { fontSize: 13, color: "#555", marginTop: 3 },
  editBtn: { background: "#007AFF", color: "#fff", border: "none", borderRadius: 8, padding: "6px 12px", fontSize: 13, cursor: "pointer" },
  delBtn: { background: "#FF3B30", color: "#fff", border: "none", borderRadius: 8, padding: "6px 12px", fontSize: 13, cursor: "pointer" },
  dayCard: { background: "#fff", width: "100%", border: "none", borderBottom: "1px solid #E5E5EA", padding: "16px", textAlign: "left", cursor: "pointer", position: "relative" },
  arrow: { position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", fontSize: 22, color: "#C7C7CC" },
  empty: { textAlign: "center", color: "#8E8E93", padding: "40px 20px", fontSize: 15, lineHeight: 1.5 },
  fab: { position: "fixed", bottom: 32, right: 16, width: 60, height: 60, borderRadius: 30, background: "#007AFF", color: "#fff", fontSize: 32, border: "none", boxShadow: "0 4px 16px rgba(0,122,255,0.4)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 },
};
