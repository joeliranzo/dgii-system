import { Injectable, OnModuleInit } from '@nestjs/common';
import * as initSqlJs from 'sql.js';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class DatabaseService implements OnModuleInit {
  private db: any = null;
  private readonly DB_PATH = path.join(process.cwd(), '..', 'data', 'ecf.db');

  async onModuleInit() {
    await this.getDb();
    console.log('✅ Base de datos inicializada');
  }

  async getDb() {
    if (this.db) return this.db;

    const SQL = await initSqlJs.default();
    const dir = path.dirname(this.DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    if (fs.existsSync(this.DB_PATH)) {
      const buffer = fs.readFileSync(this.DB_PATH);
      this.db = new SQL.Database(buffer);
    } else {
      this.db = new SQL.Database();
    }

    this.initTables();
    this.seedData();
    this.saveDb();
    return this.db;
  }

  saveDb() {
    if (!this.db) return;
    const data = this.db.export();
    const buffer = Buffer.from(data);
    const dir = path.dirname(this.DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(this.DB_PATH, buffer);
  }

  queryRows(sql: string, params: any[] = []): any[] {
    const result = this.db.exec(sql, params);
    if (result.length === 0) return [];
    const cols = result[0].columns;
    return result[0].values.map((row: any[]) => {
      const obj: any = {};
      cols.forEach((c: string, i: number) => (obj[c] = row[i]));
      return obj;
    });
  }

  run(sql: string, params: any[] = []) {
    this.db.run(sql, params);
  }

  exec(sql: string, params: any[] = []) {
    return this.db.exec(sql, params);
  }

  private initTables() {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS configuracion (
        id INTEGER PRIMARY KEY DEFAULT 1,
        rnc TEXT NOT NULL DEFAULT '',
        razon_social TEXT NOT NULL DEFAULT '',
        nombre_comercial TEXT DEFAULT '',
        direccion TEXT DEFAULT '',
        municipio TEXT DEFAULT '',
        provincia TEXT DEFAULT '',
        telefono TEXT DEFAULT '',
        correo TEXT DEFAULT '',
        website TEXT DEFAULT '',
        actividad_economica TEXT DEFAULT '',
        ambiente TEXT DEFAULT 'TesteCF',
        fecha_creacion TEXT DEFAULT (datetime('now'))
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS clientes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        rnc_cedula TEXT NOT NULL UNIQUE,
        razon_social TEXT NOT NULL,
        nombre_comercial TEXT DEFAULT '',
        direccion TEXT DEFAULT '',
        municipio TEXT DEFAULT '',
        provincia TEXT DEFAULT '',
        telefono TEXT DEFAULT '',
        correo TEXT DEFAULT '',
        tipo_identificacion INTEGER DEFAULT 1,
        activo INTEGER DEFAULT 1,
        fecha_creacion TEXT DEFAULT (datetime('now'))
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS secuencias_ecf (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tipo_ecf INTEGER NOT NULL,
        serie TEXT NOT NULL DEFAULT 'E',
        secuencia_desde INTEGER NOT NULL,
        secuencia_hasta INTEGER NOT NULL,
        secuencia_actual INTEGER NOT NULL,
        estado TEXT DEFAULT 'activa',
        fecha_autorizacion TEXT DEFAULT (datetime('now')),
        UNIQUE(tipo_ecf, serie)
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS facturas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        encf TEXT UNIQUE,
        tipo_ecf INTEGER NOT NULL,
        tipo_ingreso TEXT DEFAULT '01',
        tipo_pago INTEGER DEFAULT 1,
        cliente_id INTEGER,
        fecha_emision TEXT NOT NULL,
        fecha_vencimiento TEXT,
        subtotal REAL DEFAULT 0,
        total_descuento REAL DEFAULT 0,
        monto_gravado_18 REAL DEFAULT 0,
        monto_gravado_16 REAL DEFAULT 0,
        monto_exento REAL DEFAULT 0,
        itbis_18 REAL DEFAULT 0,
        itbis_16 REAL DEFAULT 0,
        itbis_total REAL DEFAULT 0,
        monto_total REAL DEFAULT 0,
        estado TEXT DEFAULT 'borrador',
        estado_dgii TEXT DEFAULT 'pendiente',
        trackid_dgii TEXT,
        mensaje_dgii TEXT,
        xml_generado TEXT,
        xml_firmado TEXT,
        notas TEXT DEFAULT '',
        referencia_encf TEXT,
        fecha_creacion TEXT DEFAULT (datetime('now')),
        fecha_envio_dgii TEXT,
        FOREIGN KEY (cliente_id) REFERENCES clientes(id)
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS detalle_factura (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        factura_id INTEGER NOT NULL,
        linea INTEGER NOT NULL,
        descripcion TEXT NOT NULL,
        cantidad REAL NOT NULL DEFAULT 1,
        unidad_medida TEXT DEFAULT 'UND',
        precio_unitario REAL NOT NULL DEFAULT 0,
        descuento_porcentaje REAL DEFAULT 0,
        descuento_monto REAL DEFAULT 0,
        tasa_itbis REAL DEFAULT 18,
        itbis_monto REAL DEFAULT 0,
        monto_total REAL DEFAULT 0,
        codigo_item TEXT DEFAULT '',
        FOREIGN KEY (factura_id) REFERENCES facturas(id) ON DELETE CASCADE
      )
    `);
  }

  private seedData() {
    const result = this.db.exec("SELECT COUNT(*) as c FROM configuracion");
    const count = result.length > 0 ? result[0].values[0][0] : 0;

    if (count === 0) {
      this.db.run(`
        INSERT INTO configuracion (id, rnc, razon_social, nombre_comercial, direccion, municipio, provincia, ambiente)
        VALUES (1, '', '', '', '', '', '', 'TesteCF')
      `);
    }

    const seqResult = this.db.exec("SELECT COUNT(*) as c FROM secuencias_ecf");
    const seqCount = seqResult.length > 0 ? seqResult[0].values[0][0] : 0;

    if (seqCount === 0) {
      const tipos = [
        { tipo: 31 },
        { tipo: 32 },
        { tipo: 33 },
        { tipo: 34 },
      ];
      for (const t of tipos) {
        this.db.run(
          `INSERT INTO secuencias_ecf (tipo_ecf, serie, secuencia_desde, secuencia_hasta, secuencia_actual)
           VALUES (?, 'E', 1, 9999999999, 1)`,
          [t.tipo],
        );
      }
    }
  }
}
