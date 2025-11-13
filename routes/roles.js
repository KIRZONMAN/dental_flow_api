// routes/roles.js
const express = require("express");
const { z } = require("zod");
const { connect, oidMaybe } = require("../lib/mongo");

const router = express.Router();

// ============================
// Schemas (Zod)
// ============================
const RoleNombreEnum = z.enum(["Administrador", "Odontologo", "Asistente", "Laboratorista"]);

const RoleCreate = z.object({
  nombre: RoleNombreEnum,
  descripcion: z.string().optional().transform(s => s?.trim() || undefined),
  permisos: z.array(z.string().min(1)).optional().default([]),
});

const RolePatch = z.object({
  descripcion: z.string().optional(),
  permisos: z.array(z.string().min(1)).optional(),
}).refine(v => Object.keys(v).length > 0, { message: "Nada para actualizar" });

// ============================
// Helpers
// ============================
function parseBool(v) {
  if (v == null) return null;
  const s = String(v).trim().toLowerCase();
  if (["1","true","t","yes","y"].includes(s)) return true;
  if (["0","false","f","no","n"].includes(s)) return false;
  return null;
}

// ============================
// GET /api/roles/catalogo/oficial  <-- ¡antes de :id!
// ============================
router.get("/catalogo/oficial", (_req, res) => {
  res.json({
    ok: true,
    data: RoleNombreEnum.options,
  });
});

// ============================
// POST /api/roles
// ============================
router.post("/", async (req, res) => {
  try {
    const db = await connect();
    const col = db.collection("roles");
    const body = RoleCreate.parse(req.body);

    const now = new Date();
    const doc = {
      nombre: body.nombre,
      descripcion: body.descripcion ?? null,
      permisos: body.permisos ?? [],
      createdAt: now,
      updatedAt: now,
    };

    const r = await col.insertOne(doc);
    return res.status(201).json({ ok: true, id: r.insertedId.toString() });
  } catch (e) {
    if (e && e.code === 11000) {
      return res.status(409).json({ ok: false, error: "El rol ya existe" });
    }
    return res.status(400).json({ ok: false, error: e.message });
  }
});

// ============================
// GET /api/roles
// ============================
router.get("/", async (req, res) => {
  try {
    const db = await connect();
    const col = db.collection("roles");

    const { q } = req.query;
    let { page, limit } = req.query;

    const query = {};
    if (q) {
      const rx = new RegExp(String(q), "i");
      query.$or = [{ nombre: rx }, { descripcion: rx }];
    }

    limit = Math.min(Math.max(parseInt(limit ?? "50", 10), 1), 200);
    page = Math.max(parseInt(page ?? "1", 10), 1);

    const cursor = col
      .find(query)
      .sort({ nombre: 1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const [data, total] = await Promise.all([cursor.toArray(), col.countDocuments(query)]);
    return res.json({ ok: true, total, page, pageSize: limit, data });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

// ============================
// GET /api/roles/:id
// ============================
router.get("/:id", async (req, res) => {
  try {
    const oid = oidMaybe(req.params.id);
    if (!oid) return res.status(400).json({ ok: false, error: "id inválido" });

    const db = await connect();
    const doc = await db.collection("roles").findOne({ _id: oid });
    if (!doc) return res.status(404).json({ ok: false, error: "No encontrado" });
    return res.json({ ok: true, data: doc });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

// ============================
// PATCH /api/roles/:id
// ============================
router.patch("/:id", async (req, res) => {
  try {
    const oid = oidMaybe(req.params.id);
    if (!oid) return res.status(400).json({ ok: false, error: "id inválido" });

    const patch = RolePatch.parse(req.body);
    const db = await connect();

    const $set = { updatedAt: new Date() };
    if (patch.descripcion != null) $set.descripcion = patch.descripcion.trim();
    if (patch.permisos != null) $set.permisos = patch.permisos;

    const r = await db.collection("roles").updateOne({ _id: oid }, { $set });
    if (r.matchedCount === 0) return res.status(404).json({ ok: false, error: "No encontrado" });
    return res.json({ ok: true, modified: r.modifiedCount });
  } catch (e) {
    return res.status(400).json({ ok: false, error: e.message });
  }
});

// ============================
// DELETE /api/roles/:id
// ============================
router.delete("/:id", async (req, res) => {
  try {
    const oid = oidMaybe(req.params.id);
    if (!oid) return res.status(400).json({ ok: false, error: "id inválido" });

    const db = await connect();
    const role = await db.collection("roles").findOne({ _id: oid });
    if (!role) return res.status(404).json({ ok: false, error: "No encontrado" });

    const [byId, byString] = await Promise.all([
      db.collection("usuarios").countDocuments({ rol_id: oid }),
      db.collection("usuarios").countDocuments({ rol: role.nombre }),
    ]);

    const inUse = (byId || 0) + (byString || 0);
    if (inUse > 0) {
      return res.status(409).json({
        ok: false,
        error: `No se puede eliminar: el rol está asignado a ${inUse} usuario(s). Reasigna usuarios antes de borrar.`,
        inUseBy: { byId, byString },
      });
    }

    const r = await db.collection("roles").deleteOne({ _id: oid });
    return res.json({ ok: true, deleted: r.deletedCount });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;

//si algo sale mal hazme ctrl + z