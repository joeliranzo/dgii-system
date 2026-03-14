/**
 * Sequence Manager for e-NCF (Número de Comprobante Fiscal Electrónico)
 * Format: E + 2-digit type + 10-digit sequence
 * Example: E310000000001
 */

export class SequenceManager {
  constructor(db) {
    this.db = db;
  }

  /**
   * Get next e-NCF for a given e-CF type
   */
  getNext(tipoEcf) {
    const result = this.db.exec(
      `SELECT id, serie, secuencia_actual, secuencia_hasta, estado
       FROM secuencias_ecf WHERE tipo_ecf = ? AND estado = 'activa'`,
      [tipoEcf]
    );

    if (result.length === 0 || result[0].values.length === 0) {
      throw new Error(`No hay secuencia activa para el tipo e-CF ${tipoEcf}`);
    }

    const row = result[0].values[0];
    const [id, serie, secActual, secHasta, estado] = row;

    if (secActual > secHasta) {
      throw new Error(`Secuencia agotada para el tipo e-CF ${tipoEcf}. Solicite un nuevo rango a la DGII.`);
    }

    const tipoStr = String(tipoEcf).padStart(2, '0');
    const seqStr = String(secActual).padStart(10, '0');
    const encf = `${serie}${tipoStr}${seqStr}`;

    // Increment sequence
    this.db.run(
      `UPDATE secuencias_ecf SET secuencia_actual = secuencia_actual + 1 WHERE id = ?`,
      [id]
    );

    return encf;
  }

  /**
   * Get current status of all sequences
   */
  getAll() {
    const result = this.db.exec(`
      SELECT id, tipo_ecf, serie, secuencia_desde, secuencia_hasta, secuencia_actual, estado, fecha_autorizacion
      FROM secuencias_ecf ORDER BY tipo_ecf
    `);

    if (result.length === 0) return [];

    const columns = result[0].columns;
    return result[0].values.map(row => {
      const obj = {};
      columns.forEach((col, i) => obj[col] = row[i]);
      obj.disponibles = obj.secuencia_hasta - obj.secuencia_actual + 1;
      obj.porcentaje_uso = ((obj.secuencia_actual - obj.secuencia_desde) / (obj.secuencia_hasta - obj.secuencia_desde + 1) * 100).toFixed(1);
      return obj;
    });
  }

  /**
   * Update sequence range (when DGII authorizes new range)
   */
  updateRange(tipoEcf, desde, hasta) {
    const result = this.db.exec(
      `SELECT id FROM secuencias_ecf WHERE tipo_ecf = ?`,
      [tipoEcf]
    );

    if (result.length > 0 && result[0].values.length > 0) {
      this.db.run(
        `UPDATE secuencias_ecf SET secuencia_desde = ?, secuencia_hasta = ?, secuencia_actual = ?, estado = 'activa'
         WHERE tipo_ecf = ?`,
        [desde, hasta, desde, tipoEcf]
      );
    } else {
      this.db.run(
        `INSERT INTO secuencias_ecf (tipo_ecf, serie, secuencia_desde, secuencia_hasta, secuencia_actual)
         VALUES (?, 'E', ?, ?, ?)`,
        [tipoEcf, desde, hasta, desde]
      );
    }
  }
}

export const ECF_TYPES = {
  31: { codigo: 31, nombre: 'Factura de Crédito Fiscal Electrónica', abrev: 'FCF' },
  32: { codigo: 32, nombre: 'Factura de Consumo Electrónica', abrev: 'FC' },
  33: { codigo: 33, nombre: 'Nota de Débito Electrónica', abrev: 'ND' },
  34: { codigo: 34, nombre: 'Nota de Crédito Electrónica', abrev: 'NC' },
};
