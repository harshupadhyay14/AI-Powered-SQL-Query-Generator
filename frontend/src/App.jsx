import { useState, useRef } from "react";
import { generateSQL, executeSQL, explainSQL, getSchema, getTables, uploadFile, resetSession } from "./api";
import ResultsTable from "./components/ResultsTable";
import SchemaPanel from "./components/SchemaPanel";
import {
  Sparkles, Play, Copy, Check, Lightbulb,
  Clock, AlertCircle, Database
} from "lucide-react";

const Styles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Outfit:wght@400;500;600;700;800&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #07070f; font-family: 'Outfit', sans-serif; }
    .mono { font-family: 'IBM Plex Mono', monospace !important; }
    ::-webkit-scrollbar { width: 4px; height: 4px; }
    ::-webkit-scrollbar-thumb { background: #1e1e35; border-radius: 4px; }
    .btn { transition: all 0.15s; cursor: pointer; border: none; font-family: 'Outfit', sans-serif; }
    .btn:hover { filter: brightness(1.12); }
    .btn:active { transform: scale(0.97); }
    .chip:hover { background: rgba(165,180,252,0.15) !important; color: #a5b4fc !important; }
    .fade { animation: fadeUp 0.25s ease forwards; }
    @keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
    .spin { animation: spin 1s linear infinite; display: inline-block; }
    @keyframes spin { to { transform: rotate(360deg); } }
    textarea { outline: none; }
    .hist-item:hover { background: rgba(165,180,252,0.06) !important; }
  `}</style>
);

const SAMPLES = [
  "Show top 5 customers by total spending",
  "List all products with rating above 4.5",
  "Monthly revenue for the last 6 months",
  "Most popular product categories by orders",
  "Customers who ordered more than 2 times",
  "Products with low stock (under 50 units)",
  "Average order value per city",
  "All cancelled orders with customer names",
];

export default function App() {
  const [sessionId, setSessionId] = useState(null);
  const [uploadedDb, setUploadedDb] = useState(null); // {name, tables, type}
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const [prompt,      setPrompt]      = useState("");
  const [sql,         setSql]         = useState("");
  const [explanation, setExplanation] = useState("");
  const [results,     setResults]     = useState(null);
  const [error,       setError]       = useState("");
  const [history,     setHistory]     = useState([]);
  const [activeTab,   setActiveTab]   = useState("results");
  const [explainText, setExplainText] = useState("");
  const [loadingGen,  setLoadingGen]  = useState(false);
  const [loadingRun,  setLoadingRun]  = useState(false);
  const [loadingExp,  setLoadingExp]  = useState(false);
  const [copied,      setCopied]      = useState(false);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append(file.name.endsWith(".csv") ? "csv_file" : "db_file", file);
    if (sessionId) formData.append("session_id", sessionId);
    try {
      const res = await uploadFile(formData);
      setSessionId(res.data.session_id);
      setUploadedDb({ name: file.name, tables: res.data.tables, type: res.data.type });
      setResults(null); setSql(""); setPrompt(""); setExplainText("");
    } catch (e) {
      setError("Failed to upload file: " + (e.response?.data?.error || e.message));
    } finally {
      setUploading(false);
    }
  };

  const handleReset = async () => {
    if (sessionId) await resetSession(sessionId);
    setSessionId(null); setUploadedDb(null);
    setSql(""); setResults(null); setPrompt(""); setExplainText(""); setError("");
  };
  
  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoadingGen(true); setError(""); setSql(""); setResults(null); setExplainText("");
    try {
      const res = await generateSQL(prompt, sessionId);
      const { sql: generatedSql, explanation: exp } = res.data;
      setSql(generatedSql);
      setExplanation(exp);
      await handleRun(generatedSql);
    } catch (e) {
      setError(e.response?.data?.error || "Failed to generate SQL");
    } finally {
      setLoadingGen(false);
    }
  };

  const handleRun = async (sqlToRun) => {
    const target = sqlToRun || sql;
    if (!target.trim()) return;
    setLoadingRun(true); setError(""); setActiveTab("results");
    try {
      const res = await executeSQL(target, sessionId);
      setResults(res.data);
      setHistory((h) => [
        { prompt, sql: target, rowCount: res.data.rowCount },
        ...h.slice(0, 9),
      ]);
    } catch (e) {
      setError(e.response?.data?.error || "Query failed");
      setResults(null);
    } finally {
      setLoadingRun(false);
    }
  };
  
  
  const handleExplain = async () => {
    if (!sql.trim()) return;
    setLoadingExp(true); setActiveTab("explain");
    try {
      const res = await explainSQL(sql);
      setExplainText(res.data.explanation);
    } catch {
      setExplainText("Could not explain query.");
    } finally {
      setLoadingExp(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const loadHistory = (item) => {
    setPrompt(item.prompt); setSql(item.sql);
    setResults(null); setExplainText(""); setError("");
  };

  return (
    <div style={{ background: "#07070f", minHeight: "100vh", color: "#e5e7eb" }}>
      <Styles />
      <div style={{ display: "flex", minHeight: "100vh" }}>

        {/* Sidebar */}
        <aside style={{
          width: 230, flexShrink: 0, background: "#09090f",
          borderRight: "1px solid #13132a", padding: 18,
          display: "flex", flexDirection: "column", gap: 20
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: "linear-gradient(135deg,#6366f1,#06b6d4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Database size={15} color="#fff" />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: -0.5 }}>QueryAI</div>
              <div className="mono" style={{ color: "#3a3a55", fontSize: 9 }}>SQL Generator</div>
            </div>
          </div>

          <div style={{ flex: 1, overflow: "hidden" }}>
            <SchemaPanel sessionId={sessionId} />
          </div>

          {history.length > 0 && (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                <Clock size={12} color="#4b5563" />
                <span style={{ color: "#4b5563", fontSize: 11, fontWeight: 600 }}>RECENT</span>
              </div>
              {history.slice(0, 5).map((item, i) => (
                <button key={i} onClick={() => loadHistory(item)} className="hist-item btn"
                  style={{ width: "100%", background: "none", border: "1px solid #13132a", borderRadius: 8, padding: "7px 10px", textAlign: "left", marginBottom: 4 }}>
                  <div style={{ color: "#9ca3af", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.prompt}</div>
                  <div className="mono" style={{ color: "#2a2a42", fontSize: 10, marginTop: 2 }}>{item.rowCount} rows</div>
                </button>
              ))}
            </div>
          )}
        </aside>

        {/* Main */}
        <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Upload Banner */}
          <div style={{ padding: "12px 28px", borderBottom: "1px solid #13132a", background: "#08080f", display: "flex", alignItems: "center", gap: 12 }}>
            <input ref={fileInputRef} type="file" accept=".db,.csv" onChange={handleFileUpload} style={{ display: "none" }} />
            
            {!uploadedDb ? (
              <>
                <button onClick={() => fileInputRef.current.click()} disabled={uploading} className="btn"
                  style={{ background: "linear-gradient(135deg,#6366f1,#06b6d4)", color: "#fff", borderRadius: 10, padding: "8px 18px", fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
                  {uploading ? "Uploading…" : "📂 Upload Your Database"}
                </button>
                <span style={{ color: "#3a3a55", fontSize: 12 }}>Supports .db (SQLite) and .csv files — or use the sample e-commerce DB below</span>
              </>
            ) : (
              <>
                <div style={{ background: "rgba(110,231,183,0.1)", border: "1px solid rgba(110,231,183,0.2)", borderRadius: 10, padding: "6px 14px", display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: "#6ee7b7", fontSize: 13 }}>✅ {uploadedDb.name}</span>
                  <span style={{ color: "#3a3a55", fontSize: 11 }}>({uploadedDb.tables.length} tables)</span>
                </div>
                <button onClick={() => fileInputRef.current.click()} className="btn"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid #1e1e35", borderRadius: 8, padding: "5px 12px", color: "#6b7280", fontSize: 12 }}>
                  Change File
                </button>
                <button onClick={handleReset} className="btn"
                  style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 8, padding: "5px 12px", color: "#f87171", fontSize: 12 }}>
                  ✕ Remove & Use Sample DB
                </button>
              </>
            )}
          </div>

          {/* Header */}
          <div style={{ padding: "18px 28px", borderBottom: "1px solid #13132a", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 18, letterSpacing: -0.5 }}>AI SQL Generator</div>
              <div className="mono" style={{ color: "#3a3a55", fontSize: 11, marginTop: 2 }}>Describe your query in plain English</div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", maxWidth: 480, justifyContent: "flex-end" }}>
              {SAMPLES.slice(0, 4).map((s) => (
                <button key={s} onClick={() => setPrompt(s)} className="chip btn"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid #1e1e35", borderRadius: 20, padding: "4px 12px", fontSize: 11, color: "#6b7280" }}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Prompt input */}
          <div style={{ padding: "20px 28px", borderBottom: "1px solid #13132a" }}>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
              <div style={{ flex: 1, background: "#0d0d1c", border: "1px solid #1e1e35", borderRadius: 14, padding: "14px 16px" }}>
                <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleGenerate(); } }}
                  placeholder="e.g. Show me the top 5 customers by total spending this year..."
                  rows={3}
                  style={{ width: "100%", background: "none", border: "none", color: "#e5e7eb", fontSize: 14, resize: "none", lineHeight: 1.6 }} />
                <div className="mono" style={{ color: "#2a2a42", fontSize: 10, marginTop: 4 }}>
                  Enter to generate · Shift+Enter for new line
                </div>
              </div>
              <button onClick={handleGenerate} disabled={loadingGen || !prompt.trim()} className="btn"
                style={{ background: "linear-gradient(135deg,#6366f1,#06b6d4)", color: "#fff", borderRadius: 12, padding: "14px 22px", fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", gap: 8, opacity: loadingGen || !prompt.trim() ? 0.5 : 1 }}>
                {loadingGen
                  ? <span className="spin" style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%" }} />
                  : <Sparkles size={16} />}
                {loadingGen ? "Generating…" : "Generate"}
              </button>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12 }}>
              {SAMPLES.slice(4).map((s) => (
                <button key={s} onClick={() => setPrompt(s)} className="chip btn"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid #13132a", borderRadius: 20, padding: "3px 10px", fontSize: 11, color: "#4b5563" }}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* SQL + Results area */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", padding: "20px 28px", gap: 16 }}>

            {sql && (
              <div className="fade" style={{ background: "#0a0a18", border: "1px solid #1e1e35", borderRadius: 14, overflow: "hidden" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderBottom: "1px solid #13132a", background: "#08080f" }}>
                  <span className="mono" style={{ color: "#4b5563", fontSize: 11 }}>generated query</span>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={handleCopy} className="btn"
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid #1e1e35", borderRadius: 8, padding: "5px 12px", color: copied ? "#6ee7b7" : "#6b7280", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                      {copied ? <Check size={12} /> : <Copy size={12} />}
                      {copied ? "Copied!" : "Copy"}
                    </button>
                    <button onClick={handleExplain} disabled={loadingExp} className="btn"
                      style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)", borderRadius: 8, padding: "5px 12px", color: "#fbbf24", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                      <Lightbulb size={12} />
                      {loadingExp ? "Explaining…" : "Explain"}
                    </button>
                    <button onClick={() => handleRun()} disabled={loadingRun} className="btn"
                      style={{ background: "rgba(110,231,183,0.1)", border: "1px solid rgba(110,231,183,0.25)", borderRadius: 8, padding: "5px 14px", color: "#6ee7b7", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                      {loadingRun
                        ? <span className="spin" style={{ width: 12, height: 12, border: "2px solid rgba(110,231,183,0.3)", borderTopColor: "#6ee7b7", borderRadius: "50%" }} />
                        : <Play size={12} />}
                      {loadingRun ? "Running…" : "Run"}
                    </button>
                  </div>
                </div>
                <textarea value={sql} onChange={(e) => setSql(e.target.value)}
                  rows={Math.min(sql.split("\n").length + 1, 10)}
                  style={{ width: "100%", background: "none", border: "none", color: "#a5b4fc", padding: "14px 18px", fontFamily: "'IBM Plex Mono',monospace", fontSize: 13, lineHeight: 1.7, resize: "none" }} />
                {explanation && (
                  <div style={{ padding: "8px 18px 12px", borderTop: "1px solid #13132a", color: "#6b7280", fontSize: 12, fontStyle: "italic" }}>
                    {explanation}
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="fade" style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
                <AlertCircle size={16} color="#f87171" style={{ flexShrink: 0 }} />
                <span className="mono" style={{ color: "#f87171", fontSize: 12 }}>{error}</span>
              </div>
            )}

            {(results || explainText) && (
              <div className="fade" style={{ background: "#0a0a18", border: "1px solid #1e1e35", borderRadius: 14, overflow: "hidden", flex: 1, display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", borderBottom: "1px solid #13132a", background: "#08080f" }}>
                  <div style={{ display: "flex" }}>
                    {["results", "explain"].map((tab) => (
                      <button key={tab} onClick={() => setActiveTab(tab)} className="btn"
                        style={{ background: "none", padding: "10px 16px", color: activeTab === tab ? "#a5b4fc" : "#4b5563", borderBottom: activeTab === tab ? "2px solid #6366f1" : "2px solid transparent", fontSize: 12, fontWeight: 600, textTransform: "capitalize" }}>
                        {tab}
                      </button>
                    ))}
                  </div>
                  {results && <span className="mono" style={{ color: "#2a2a42", fontSize: 11 }}>{results.rowCount} rows</span>}
                </div>
                <div style={{ flex: 1, overflowY: "auto" }}>
                  {activeTab === "results" && results && (
                    results.rows.length === 0
                      ? <div style={{ padding: 24, color: "#4b5563", fontSize: 13, textAlign: "center" }}>No rows returned.</div>
                      : <ResultsTable columns={results.columns} rows={results.rows} />
                  )}
                  {activeTab === "explain" && (
                    <div style={{ padding: "18px 20px", color: "#9ca3af", fontSize: 14, lineHeight: 1.7 }}>
                      {loadingExp
                        ? <span style={{ color: "#4b5563" }}>Generating explanation…</span>
                        : explainText || <span style={{ color: "#4b5563" }}>Click "Explain" for a plain-English breakdown.</span>}
                    </div>
                  )}
                </div>
              </div>
            )}

            {!sql && !error && (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: "rgba(99,102,241,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Sparkles size={24} color="#4b5563" />
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontWeight: 700, fontSize: 16, color: "#3a3a55" }}>Describe your query</div>
                  <div className="mono" style={{ fontSize: 12, marginTop: 4, color: "#2a2a42" }}>Type a question above or pick a sample prompt</div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}