import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export const ECF_TYPES: Record<number, { codigo: number; nombre: string; abrev: string }> = {
  31: { codigo: 31, nombre: 'Factura de Crédito Fiscal Electrónica', abrev: 'FCF' },
  32: { codigo: 32, nombre: 'Factura de Consumo Electrónica', abrev: 'FC' },
  33: { codigo: 33, nombre: 'Nota de Débito Electrónica', abrev: 'ND' },
  34: { codigo: 34, nombre: 'Nota de Crédito Electrónica', abrev: 'NC' },
};

@Injectable()
export class SequenceManagerService {
  constructor(private readonly db: DatabaseService) {}

  getNext(tipoEcf: number): string {
    const result = this.db.exec(
      `SELECT id, serie, secuencia_actual, secuencia_hasta, estado
       FROM secuencias_ecf WHERE tipo_ecf = ? AND estado = 'activa'`,
      [tipoEcf],
    );

    if (result.length === 0 || result[0].values.length === 0) {
      throw new Error(`No hay secuencia activa para el tipo e-CF ${tipoEcf}`);
    }

    const row = result[0].values[0];
    const [id, serie, secActual, secHasta] = row;

    if (secActual > secHasta) {
      throw new Error(`Secuencia agotada para el tipo e-CF ${tipoEcf}. Solicite un nuevo rango a la DGII.`);
    }

    const tipoStr = String(tipoEcf).padStart(2, '0');
    const seqStr = String(secActual).padStart(10, '0');
    const encf = `${serie}${tipoStr}${seqStr}`;

    this.db.run(
      `UPDATE secuencias_ecf SET secuencia_actual = secuencia_actual + 1 WHERE id = ?`,
      [id],
    );

    return encf;
  }

  getAll(): any[] {
    const result = this.db.exec(`
      SELECT id, tipo_ecf, serie, secuencia_desde, secuencia_hasta, secuencia_actual, estado, fecha_autorizacion
      FROM secuencias_ecf ORDER BY tipo_ecf
    `);

    if (result.length === 0) return [];

    const columns = result[0].columns;
    return result[0].values.map((row: any[]) => {
      const obj: any = {};
      columns.forEach((col: string, i: number) => (obj[col] = row[i]));
      obj.disponibles = obj.secuencia_hasta - obj.secuencia_actual + 1;
      obj.porcentaje_uso = (
        ((obj.secuencia_actual - obj.secuencia_desde) /
          (obj.secuencia_hasta - obj.secuencia_desde + 1)) *
        100
      ).toFixed(1);
      return obj;
    });
  }

  updateRange(tipoEcf: number, desde: number, hasta: number) {
    const result = this.db.exec(
      `SELECT id FROM secuencias_ecf WHERE tipo_ecf = ?`,
      [tipoEcf],
    );

    if (result.length > 0 && result[0].values.length > 0) {
      this.db.run(
        `UPDATE secuencias_ecf SET secuencia_desde = ?, secuencia_hasta = ?, secuencia_actual = ?, estado = 'activa'
         WHERE tipo_ecf = ?`,
        [desde, hasta, desde, tipoEcf],
      );
    } else {
      this.db.run(
        `INSERT INTO secuencias_ecf (tipo_ecf, serie, secuencia_desde, secuencia_hasta, secuencia_actual)
         VALUES (?, 'E', ?, ?, ?)`,
        [tipoEcf, desde, hasta, desde],
      );
    }
  }
}
