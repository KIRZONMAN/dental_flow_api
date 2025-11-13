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

// Recomendado para apps detrás de proxy (Railway)
app.set("trust proxy", 1);

// Middlewares base
app.use(cors());
app.use(express.json());

// Root simple (útil para pruebas rápidas)
app.get("/", (_req, res) => res.send("DentalFlow API up"));

// Health (público)
app.get("/health", (_req, res) => res.json({ ok: true, ts: Date.now() }));

// Si definiste API_KEY en variables de entorno, protege todo /api automáticamente
if ((process.env.API_KEY || "").trim() !== "") {
  app.use("/api", apiKeyAuth);
  console.log("[auth] API key enabled for /api");
} else {
  console.warn("[auth] API_KEY not set — /api is public for now");
}

// Subrutas
app.use("/api/usuarios", usuarios);
app.use("/api/pacientes", pacientes);
app.use("/api/citas", citas);
app.use("/api/historias", historias);
app.use("/api/procedimientos", procedimientos);
app.use("/api/roles", roles);
app.use("/api/ordenes-laboratorio", ordenesLab);
app.use("/api/historias-clinicas", historiasClinicas);

// 404 para cualquier endpoint no encontrado
app.use((req, res) => res.status(404).json({ ok: false, error: "Not found" }));

// Manejador de errores (fallback)
app.use((err, _req, res, _next) => {
  console.error("[unhandled]", err);
  res.status(500).json({ ok: false, error: "Internal error" });
});

const PORT = process.env.PORT || 3000;
const HOST = "0.0.0.0";

app.listen(PORT, HOST, () => {
  console.log(`DentalFlow server running on http://${HOST}:${PORT}`);
  console.log(`Health check: http://${HOST}:${PORT}/health`);
});
