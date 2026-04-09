import axios from "axios";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:5001",
});

export const generateSQL = (prompt, session_id) => api.post("/generate", { prompt, session_id });
export const executeSQL  = (sql, session_id)    => api.post("/execute",  { sql, session_id });
export const explainSQL  = (sql)                => api.post("/explain",  { sql });
export const getSchema   = (session_id)         => api.get(`/schema${session_id ? `?session_id=${session_id}` : ""}`);
export const getTables   = (session_id)         => api.get(`/tables${session_id ? `?session_id=${session_id}` : ""}`);
export const uploadFile  = (formData)           => api.post("/upload", formData, { headers: { "Content-Type": "multipart/form-data" }});
export const resetSession = (session_id)        => api.post("/reset", { session_id });

export default api;