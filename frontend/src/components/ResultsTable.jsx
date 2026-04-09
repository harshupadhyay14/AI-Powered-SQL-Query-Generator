const ResultsTable = ({ columns, rows }) => {
  if (!columns?.length) return null;

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col} style={{
                textAlign: "left", padding: "10px 14px",
                background: "#0a0a15", color: "#6ee7b7",
                fontFamily: "'IBM Plex Mono', monospace", fontSize: 12,
                fontWeight: 500, borderBottom: "1px solid #1e1e35",
                whiteSpace: "nowrap"
              }}>
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} style={{ borderBottom: "1px solid #12121f" }}>
              {row.map((cell, ci) => (
                <td key={ci} style={{
                  padding: "9px 14px", color: "#c9d1e0",
                  fontFamily: "'IBM Plex Mono', monospace", fontSize: 12,
                  background: ri % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)",
                  whiteSpace: "nowrap"
                }}>
                  {cell === null
                    ? <span style={{ color: "#3a3a55" }}>NULL</span>
                    : String(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ResultsTable;