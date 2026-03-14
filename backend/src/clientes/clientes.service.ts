import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class ClientesService {
  constructor(private readonly db: DatabaseService) {}

  findAll(query: { search?: string; page?: number; limit?: number }) {
    const { search, page = 1, limit = 50 } = query;
    let sql = "SELECT * FROM clientes WHERE activo = 1";
    const params: any[] = [];

    if (search) {
      sql += " AND (rnc_cedula LIKE ? OR razon_social LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }

    sql += " ORDER BY razon_social";
    sql += ` LIMIT ? OFFSET ?`;
    params.push(Number(limit), (Number(page) - 1) * Number(limit));

    const clientes = this.db.queryRows(sql, params);
    return { clientes };
  }

  findOne(id: number) {
    const clientes = this.db.queryRows("SELECT * FROM clientes WHERE id = ?", [id]);
    if (clientes.length === 0) throw new NotFoundException('Cliente no encontrado');
    return clientes[0];
  }

  create(body: any) {
    const { rnc_cedula, razon_social, nombre_comercial = '', direccion = '', municipio = '', provincia = '', telefono = '', correo = '', tipo_identificacion = 1 } = body;

    if (!rnc_cedula || !razon_social) {
      throw new BadRequestException('RNC/Cédula y Razón Social son requeridos');
    }

    const existing = this.db.queryRows("SELECT id FROM clientes WHERE rnc_cedula = ?", [rnc_cedula]);
    if (existing.length > 0) {
      throw new ConflictException('Ya existe un cliente con ese RNC/Cédula');
    }

    this.db.run(
      `INSERT INTO clientes (rnc_cedula, razon_social, nombre_comercial, direccion, municipio, provincia, telefono, correo, tipo_identificacion)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [rnc_cedula, razon_social, nombre_comercial, direccion, municipio, provincia, telefono, correo, tipo_identificacion],
    );

    const idResult = this.db.exec("SELECT last_insert_rowid()");
    const id = idResult[0].values[0][0];
    this.db.saveDb();

    return { id, rnc_cedula, razon_social, message: 'Cliente creado exitosamente' };
  }

  update(id: number, body: any) {
    const { razon_social, nombre_comercial, direccion, municipio, provincia, telefono, correo } = body;

    this.db.run(
      `UPDATE clientes SET razon_social = COALESCE(?, razon_social),
        nombre_comercial = COALESCE(?, nombre_comercial),
        direccion = COALESCE(?, direccion), municipio = COALESCE(?, municipio),
        provincia = COALESCE(?, provincia), telefono = COALESCE(?, telefono),
        correo = COALESCE(?, correo)
        WHERE id = ?`,
      [razon_social, nombre_comercial, direccion, municipio, provincia, telefono, correo, id],
    );
    this.db.saveDb();

    return { message: 'Cliente actualizado' };
  }

  remove(id: number) {
    this.db.run("UPDATE clientes SET activo = 0 WHERE id = ?", [id]);
    this.db.saveDb();
    return { message: 'Cliente eliminado' };
  }
}
