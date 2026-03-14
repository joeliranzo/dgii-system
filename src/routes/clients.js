import { Router } from 'express';
import { getDb, saveDb } from '../db/database.js';

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

// List clients
router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    const { search, page = 1, limit = 50 } = req.query;
    let sql = "SELECT * FROM clientes WHERE activo = 1";
    const params = [];

    if (search) {
      sql += " AND (rnc_cedula LIKE ? OR razon_social LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }

    sql += " ORDER BY razon_social";
    sql += ` LIMIT ? OFFSET ?`;
    params.push(Number(limit), (Number(page) - 1) * Number(limit));

    const clientes = queryRows(db, sql, params);
    res.json({ clientes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get client by ID
router.get('/:id', async (req, res) => {
  try {
    const db = await getDb();
    const clientes = queryRows(db, "SELECT * FROM clientes WHERE id = ?", [Number(req.params.id)]);
    if (clientes.length === 0) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json(clientes[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create client
router.post('/', async (req, res) => {
  try {
    const db = await getDb();
    const { rnc_cedula, razon_social, nombre_comercial = '', direccion = '', municipio = '', provincia = '', telefono = '', correo = '', tipo_identificacion = 1 } = req.body;

    if (!rnc_cedula || !razon_social) {
      return res.status(400).json({ error: 'RNC/Cédula y Razón Social son requeridos' });
    }

    // Check for duplicates
    const existing = queryRows(db, "SELECT id FROM clientes WHERE rnc_cedula = ?", [rnc_cedula]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Ya existe un cliente con ese RNC/Cédula' });
    }

    db.run(`INSERT INTO clientes (rnc_cedula, razon_social, nombre_comercial, direccion, municipio, provincia, telefono, correo, tipo_identificacion)
            VALUES (?,?,?,?,?,?,?,?,?)`,
      [rnc_cedula, razon_social, nombre_comercial, direccion, municipio, provincia, telefono, correo, tipo_identificacion]
    );

    const idResult = db.exec("SELECT last_insert_rowid()");
    const id = idResult[0].values[0][0];
    saveDb();

    res.status(201).json({ id, rnc_cedula, razon_social, message: 'Cliente creado exitosamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update client
router.put('/:id', async (req, res) => {
  try {
    const db = await getDb();
    const { razon_social, nombre_comercial, direccion, municipio, provincia, telefono, correo } = req.body;

    db.run(`UPDATE clientes SET razon_social = COALESCE(?, razon_social),
            nombre_comercial = COALESCE(?, nombre_comercial),
            direccion = COALESCE(?, direccion), municipio = COALESCE(?, municipio),
            provincia = COALESCE(?, provincia), telefono = COALESCE(?, telefono),
            correo = COALESCE(?, correo)
            WHERE id = ?`,
      [razon_social, nombre_comercial, direccion, municipio, provincia, telefono, correo, Number(req.params.id)]
    );
    saveDb();

    res.json({ message: 'Cliente actualizado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete (soft) client
router.delete('/:id', async (req, res) => {
  try {
    const db = await getDb();
    db.run("UPDATE clientes SET activo = 0 WHERE id = ?", [Number(req.params.id)]);
    saveDb();
    res.json({ message: 'Cliente eliminado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
