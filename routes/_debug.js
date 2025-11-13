// routes/_debug.js
const express = require("express");
const router = express.Router();
const { connect } = require("../lib/mongo");

router.get("/db-ping", async (_req, res) => {
  try {
    const db = await connect();
    const ping = await db.command({ ping: 1 });
    const colls = await db.listCollections({}, { nameOnly: true }).toArray();
    res.json({
      ok: true,
      db: db.databaseName,
      ping,
      collections: colls.map(c => c.name).sort(),
      ts: new Date().toISOString()
    });
  } catch (e) {
    console.error("[debug/db-ping]", e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;