import { useEffect, useState } from "react";
import { getTables, getSchema } from "../api";
import { Database, ChevronDown, ChevronRight } from "lucide-react";

const TABLE_COLS = {};

const SchemaPanel = ({ sessionId }) => {
  const [tables,     setTables]     = useState({});
  const [schema,     setSchema]     = useState("");
  const [open,       setOpen]       = useState({});
  const [showSchema, setShowSchema] = useState(false);

  useEffect(() => {
    getTables(sessionId).then((r) => setTables(r.data.tables)).catch(() => {});
    getSchema(sessionId).then((r) => setSchema(r.data.schema)).catch(() => {});
  }, [sessionId]);

  const toggle = (t) => setOpen((p) => ({ ...p, [t]: !p[t] }));

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <Database size={15} color="#6ee7b7" />
        <span style={{ color: "#e5e7eb", fontWeight: 700, fontSize: 13 }}>
          {sessionId ? "your database" : "sample.db"}
        </span>
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        {Object.entries(tables).map(([name, count]) => (
          <div key={name} style={{ marginBottom: 4 }}>
            <button onClick={() => toggle(name)} style={{
              width: "100%", display: "flex", alignItems: "center",
              justifyContent: "space-between",
              background: "rgba(255,255,255,0.04)", border: "1px solid #1e1e35",
              borderRadius: 8, padding: "7px 10px", cursor: "pointer",
              color: "#c9d1e0", fontSize: 12
            }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {open[name]
                  ? <ChevronDown size={12} color="#6ee7b7" />
                  : <ChevronRight size={12} color="#4b5563" />}
                <span style={{ fontFamily: "'IBM Plex Mono',monospace", color: "#a5b4fc" }}>
                  {name}
                </span>
              </span>
              <span style={{ background: "rgba(110,231,183,0.1)", color: "#6ee7b7", borderRadius: 10, padding: "1px 7px", fontSize: 10 }}>
                {count}
              </span>
            </button>

            {open[name] && TABLE_COLS[name] && (
              <div style={{ marginLeft: 12, marginTop: 3, display: "flex", flexDirection: "column", gap: 2 }}>
                {TABLE_COLS[name].map((col) => (
                  <div key={col} style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: "#4b5563", padding: "2px 8px" }}>
                    · {col}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ marginTop: 12 }}>
        <button onClick={() => setShowSchema((s) => !s)} style={{
          width: "100%", background: "none", border: "1px solid #1e1e35",
          borderRadius: 8, padding: "6px 10px", color: "#4b5563",
          fontSize: 11, cursor: "pointer"
        }}>
          {showSchema ? "Hide" : "Show"} Raw Schema
        </button>
        {showSchema && (
          <pre style={{
            marginTop: 8, background: "#080812", border: "1px solid #1e1e35",
            borderRadius: 8, padding: 10, color: "#4b5563",
            fontSize: 10, fontFamily: "'IBM Plex Mono',monospace",
            whiteSpace: "pre-wrap", maxHeight: 200, overflowY: "auto"
          }}>{schema}</pre>
        )}
      </div>
    </div>
  );
};

export default SchemaPanel;