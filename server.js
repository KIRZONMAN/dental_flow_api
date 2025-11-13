// server.js
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();

const apiKeyAuth = require("./middlewares/auth");

// Rutas
const usuarios = require("./routes/usuarios");
const pacientes = require("./routes/pacientes");
const citas = require("./routes/citas");
const historias = require("./routes/historias");
const procedimientos = require("./routes/procedimientos");
const roles = require("./routes/roles");
const ordenesLab = require("./routes/ordenes_laboratorio");
const historiasClinicas = require("./routes/historiasClinicas");

const app = express();

// Middlewares base
app.use(cors());
app.use(express.json());

// Home informativa (pública)
app.get("/", (_req, res) => {
  res.json({
    ok: true,
    service: "DentalFlow API",
    version: "1.0.0",
    health: "/health",
    api_base: "/api",
    tips: "Prueba /health y /api/_debug/db-ping para verificar BD.",
    ts: new Date().toISOString()
  });
});

// Health (público)
app.get("/health", (_req, res) => res.json({ ok: true, ts: Date.now() }));

// 🔐 Protección por API Key opcional controlada por ENV
// Activa solo si DEFINES API_KEY (y opcional ENABLE_API_KEY !== 'false')
const enableApiKey =
  (process.env.ENABLE_API_KEY ?? "true").toLowerCase() !== "false" &&
  !!process.env.API_KEY;

if (enableApiKey) {
  app.use("/api", apiKeyAuth);
}

// ---- rutas de depuración (públicas si no activas API key)
app.use("/api/_debug", require("./routes/_debug"));

// ---- Subrutas de API
app.use("/api/usuarios", usuarios);
app.use("/api/pacientes", pacientes);
app.use("/api/citas", citas);
app.use("/api/historias", historias);
app.use("/api/procedimientos", procedimientos);
app.use("/api/roles", roles);
app.use("/api/ordenes-laboratorio", ordenesLab);
app.use("/api/historias-clinicas", historiasClinicas);

// 404 para endpoints no encontrados
app.use((req, res) => res.status(404).json({ ok: false, error: "Not found" }));

// Manejador de errores
app.use((err, _req, res, _next) => {
  console.error("[unhandled]", err);
  res.status(500).json({ ok: false, error: "Internal error" });
});

// Bind explícito de host/port (Railway setea PORT)
const HOST = process.env.HOST || "0.0.0.0";
const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, HOST, () => {
  console.log(`DentalFlow server running on http://${HOST}:${PORT}`);
  console.log(`Health check: http://${HOST}:${PORT}/health`);
});