import { Router } from 'express';
import { getDb, saveDb } from '../db/database.js';
import { SequenceManager } from '../ecf/sequence-manager.js';
import { buildEcfXml } from '../ecf/xml-builder.js';
import { signXmlDemo } from '../ecf/signer.js';
import { DgiiApiClient } from '../dgii/api-client.js';

const router = Router();
const dgiiClient = new DgiiApiClient('TesteCF');

// Helper to query rows
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

// Get dashboard stats
router.get('/stats/dashboard', async (req, res) => {
  try {
    const db = await getDb();

    const total = db.exec("SELECT COUNT(*) FROM facturas");
    const creadas = db.exec("SELECT COUNT(*) FROM facturas WHERE estado = 'creada'");
    const enviadas = db.exec("SELECT COUNT(*) FROM facturas WHERE estado = 'enviada'");
    const aceptadas = db.exec("SELECT COUNT(*) FROM facturas WHERE estado_dgii = 'Aceptado'");
    const rechazadas = db.exec("SELECT COUNT(*) FROM facturas WHERE estado_dgii = 'Rechazado'");
    const montoTotal = db.exec("SELECT COALESCE(SUM(monto_total), 0) FROM facturas");
    const montoMes = db.exec("SELECT COALESCE(SUM(monto_total), 0) FROM facturas WHERE fecha_emision >= date('now', 'start of month')");

    const recientes = queryRows(db,
      `SELECT f.id, f.encf, f.tipo_ecf, f.monto_total, f.estado, f.estado_dgii, f.fecha_emision,
              c.razon_social as cliente_nombre
       FROM facturas f LEFT JOIN clientes c ON f.cliente_id = c.id
       ORDER BY f.fecha_creacion DESC LIMIT 10`
    );

    res.json({
      total: total[0]?.values[0][0] || 0,
      creadas: creadas[0]?.values[0][0] || 0,
      enviadas: enviadas[0]?.values[0][0] || 0,
      aceptadas: aceptadas[0]?.values[0][0] || 0,
      rechazadas: rechazadas[0]?.values[0][0] || 0,
      montoTotal: montoTotal[0]?.values[0][0] || 0,
      montoMes: montoMes[0]?.values[0][0] || 0,
      recientes
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List invoices
router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    const { estado, tipo_ecf, page = 1, limit = 50 } = req.query;
    let sql = `SELECT f.*, c.razon_social as cliente_nombre, c.rnc_cedula as cliente_rnc
               FROM facturas f LEFT JOIN clientes c ON f.cliente_id = c.id`;
    const conditions = [];
    const params = [];

    if (estado) { conditions.push('f.estado = ?'); params.push(estado); }
    if (tipo_ecf) { conditions.push('f.tipo_ecf = ?'); params.push(Number(tipo_ecf)); }
    if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ' ORDER BY f.fecha_creacion DESC';
    sql += ` LIMIT ? OFFSET ?`;
    params.push(Number(limit), (Number(page) - 1) * Number(limit));

    const facturas = queryRows(db, sql, params);

    const countResult = db.exec("SELECT COUNT(*) FROM facturas");
    const total = countResult.length > 0 ? countResult[0].values[0][0] : 0;

    res.json({ facturas, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get invoice by ID
router.get('/:id', async (req, res) => {
  try {
    const db = await getDb();
    const facturas = queryRows(db,
      `SELECT f.*, c.razon_social as cliente_nombre, c.rnc_cedula as cliente_rnc
       FROM facturas f LEFT JOIN clientes c ON f.cliente_id = c.id WHERE f.id = ?`,
      [Number(req.params.id)]
    );

    if (facturas.length === 0) return res.status(404).json({ error: 'Factura no encontrada' });

    const detalles = queryRows(db,
      `SELECT * FROM detalle_factura WHERE factura_id = ? ORDER BY linea`,
      [Number(req.params.id)]
    );

    res.json({ factura: facturas[0], detalles });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create invoice
router.post('/', async (req, res) => {
  try {
    const db = await getDb();
    const { tipo_ecf, cliente_id, tipo_pago = 1, fecha_vencimiento, notas = '', referencia_encf = '', items = [] } = req.body;

    if (!tipo_ecf || !items.length) {
      return res.status(400).json({ error: 'Tipo de e-CF e ítems son requeridos' });
    }

    const fecha_emision = new Date().toISOString().split('T')[0];

    // Calculate totals
    let subtotal = 0, totalDescuento = 0, montoGravado18 = 0, montoGravado16 = 0, montoExento = 0;
    let itbis18 = 0, itbis16 = 0, itbisTotal = 0;

    const processedItems = items.map((item, idx) => {
      const cantidad = Number(item.cantidad) || 1;
      const precio = Number(item.precio_unitario) || 0;
      const descPct = Number(item.descuento_porcentaje) || 0;
      const tasaItbis = Number(item.tasa_itbis) ?? 18;

      const montoBase = cantidad * precio;
      const descMonto = montoBase * (descPct / 100);
      const montoGravable = montoBase - descMonto;
      const itbisMonto = montoGravable * (tasaItbis / 100);
      const montoTotal = montoGravable + itbisMonto;

      subtotal += montoBase;
      totalDescuento += descMonto;

      if (tasaItbis === 18) { montoGravado18 += montoGravable; itbis18 += itbisMonto; }
      else if (tasaItbis === 16) { montoGravado16 += montoGravable; itbis16 += itbisMonto; }
      else { montoExento += montoGravable; }

      itbisTotal += itbisMonto;

      return {
        linea: idx + 1,
        descripcion: item.descripcion,
        cantidad,
        unidad_medida: item.unidad_medida || 'UND',
        precio_unitario: precio,
        descuento_porcentaje: descPct,
        descuento_monto: descMonto,
        tasa_itbis: tasaItbis,
        itbis_monto: itbisMonto,
        monto_total: montoTotal,
        codigo_item: item.codigo_item || ''
      };
    });

    const montoTotal = montoGravado18 + montoGravado16 + montoExento + itbisTotal;

    // Get e-NCF
    const seqManager = new SequenceManager(db);
    const encf = seqManager.getNext(Number(tipo_ecf));

    // Insert invoice
    db.run(`INSERT INTO facturas (encf, tipo_ecf, tipo_pago, cliente_id, fecha_emision, fecha_vencimiento,
            subtotal, total_descuento, monto_gravado_18, monto_gravado_16, monto_exento,
            itbis_18, itbis_16, itbis_total, monto_total, estado, notas, referencia_encf)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [encf, tipo_ecf, tipo_pago, cliente_id || null, fecha_emision, fecha_vencimiento || fecha_emision,
       subtotal, totalDescuento, montoGravado18, montoGravado16, montoExento,
       itbis18, itbis16, itbisTotal, montoTotal, 'creada', notas, referencia_encf]
    );

    // Get the inserted ID
    const idResult = db.exec("SELECT last_insert_rowid()");
    const facturaId = idResult[0].values[0][0];

    // Insert detail items
    for (const item of processedItems) {
      db.run(`INSERT INTO detalle_factura (factura_id, linea, descripcion, cantidad, unidad_medida,
              precio_unitario, descuento_porcentaje, descuento_monto, tasa_itbis, itbis_monto, monto_total, codigo_item)
              VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        [facturaId, item.linea, item.descripcion, item.cantidad, item.unidad_medida,
         item.precio_unitario, item.descuento_porcentaje, item.descuento_monto,
         item.tasa_itbis, item.itbis_monto, item.monto_total, item.codigo_item]
      );
    }

    // Generate XML
    const config = queryRows(db, "SELECT * FROM configuracion WHERE id = 1");
    const emisor = config[0] || {};
    let comprador = null;
    if (cliente_id) {
      const clientes = queryRows(db, "SELECT * FROM clientes WHERE id = ?", [Number(cliente_id)]);
      comprador = clientes[0] || null;
    }

    const facturaData = {
      tipo_ecf: Number(tipo_ecf), encf, fecha_emision, fecha_vencimiento: fecha_vencimiento || fecha_emision,
      tipo_pago, tipo_ingreso: '01', monto_gravado_18: montoGravado18, monto_gravado_16: montoGravado16,
      monto_exento: montoExento, itbis_18: itbis18, itbis_16: itbis16, itbis_total: itbisTotal,
      monto_total: montoTotal, referencia_encf
    };

    const xmlContent = buildEcfXml(facturaData, processedItems, emisor, comprador);

    // Sign XML (demo mode)
    const xmlFirmado = signXmlDemo(xmlContent);

    // Update invoice with XML
    db.run("UPDATE facturas SET xml_generado = ?, xml_firmado = ? WHERE id = ?",
      [xmlContent, xmlFirmado, facturaId]);

    saveDb();

    res.status(201).json({
      id: facturaId,
      encf,
      monto_total: montoTotal,
      estado: 'creada',
      message: 'Factura creada exitosamente'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Send invoice to DGII
router.post('/:id/enviar', async (req, res) => {
  try {
    const db = await getDb();
    const facturas = queryRows(db, "SELECT * FROM facturas WHERE id = ?", [Number(req.params.id)]);
    if (facturas.length === 0) return res.status(404).json({ error: 'Factura no encontrada' });

    const factura = facturas[0];
    if (!factura.xml_firmado) return res.status(400).json({ error: 'La factura no tiene XML firmado' });

    // Use simulated mode
    const result = await dgiiClient.simulateSend(factura.encf);

    db.run(`UPDATE facturas SET estado = 'enviada', estado_dgii = ?, trackid_dgii = ?,
            mensaje_dgii = ?, fecha_envio_dgii = datetime('now') WHERE id = ?`,
      [result.success ? 'enviado' : 'error', result.trackId, result.message, factura.id]
    );
    saveDb();

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Check DGII status
router.post('/:id/consultar', async (req, res) => {
  try {
    const db = await getDb();
    const facturas = queryRows(db, "SELECT * FROM facturas WHERE id = ?", [Number(req.params.id)]);
    if (facturas.length === 0) return res.status(404).json({ error: 'Factura no encontrada' });

    const factura = facturas[0];
    if (!factura.trackid_dgii) return res.status(400).json({ error: 'La factura no ha sido enviada a la DGII' });

    const result = await dgiiClient.simulateCheck(factura.trackid_dgii);

    db.run(`UPDATE facturas SET estado_dgii = ?, mensaje_dgii = ? WHERE id = ?`,
      [result.status, result.message, factura.id]
    );
    saveDb();

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete invoice (only drafts)
router.delete('/:id', async (req, res) => {
  try {
    const db = await getDb();
    const facturas = queryRows(db, "SELECT * FROM facturas WHERE id = ?", [Number(req.params.id)]);
    if (facturas.length === 0) return res.status(404).json({ error: 'Factura no encontrada' });
    if (facturas[0].estado !== 'borrador' && facturas[0].estado !== 'creada') {
      return res.status(400).json({ error: 'Solo se pueden eliminar facturas en borrador o creadas' });
    }

    db.run("DELETE FROM detalle_factura WHERE factura_id = ?", [Number(req.params.id)]);
    db.run("DELETE FROM facturas WHERE id = ?", [Number(req.params.id)]);
    saveDb();

    res.json({ message: 'Factura eliminada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


export default router;
