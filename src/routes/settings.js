import { Router } from 'express';
import { getDb, saveDb } from '../db/database.js';
import { SequenceManager } from '../ecf/sequence-manager.js';

const router = Router();

function queryRows(db, sql, params = []) {
  const result = db.exec(sql, params);
  if (result.length === 0) return [];
  const cols = result[0].columns;
  return result[0].values.map(row => {
    const obj = {};
    cols.forEach((c, i) => obj[c] = row[i]);
    return obj;
  });
}

// Get settings
router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    const config = queryRows(db, "SELECT * FROM configuracion WHERE id = 1");
    const seqManager = new SequenceManager(db);
    const secuencias = seqManager.getAll();

    res.json({
      configuracion: config[0] || {},
      secuencias
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update settings
router.put('/', async (req, res) => {
  try {
    const db = await getDb();
    const { rnc, razon_social, nombre_comercial, direccion, municipio, provincia, telefono, correo, website, actividad_economica, ambiente } = req.body;

    db.run(`UPDATE configuracion SET
            rnc = COALESCE(?, rnc),
            razon_social = COALESCE(?, razon_social),
            nombre_comercial = COALESCE(?, nombre_comercial),
            direccion = COALESCE(?, direccion),
            municipio = COALESCE(?, municipio),
            provincia = COALESCE(?, provincia),
            telefono = COALESCE(?, telefono),
            correo = COALESCE(?, correo),
            website = COALESCE(?, website),
            actividad_economica = COALESCE(?, actividad_economica),
            ambiente = COALESCE(?, ambiente)
            WHERE id = 1`,
      [rnc, razon_social, nombre_comercial, direccion, municipio, provincia, telefono, correo, website, actividad_economica, ambiente]
    );
    saveDb();

    res.json({ message: 'Configuración actualizada exitosamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update sequence range
router.put('/secuencias/:tipo', async (req, res) => {
  try {
    const db = await getDb();
    const { desde, hasta } = req.body;
    const tipo = Number(req.params.tipo);

    if (!desde || !hasta) {
      return res.status(400).json({ error: 'Rango desde/hasta es requerido' });
    }

    const seqManager = new SequenceManager(db);
    seqManager.updateRange(tipo, desde, hasta);
    saveDb();

    res.json({ message: 'Secuencia actualizada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
