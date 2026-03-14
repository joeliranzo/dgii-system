import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { SequenceManagerService } from '../ecf/sequence-manager.service';
import { XmlBuilderService } from '../ecf/xml-builder.service';
import { SignerService } from '../ecf/signer.service';
import { DgiiApiService } from '../dgii/dgii-api.service';

@Injectable()
export class FacturasService {
  constructor(
    private readonly db: DatabaseService,
    private readonly sequenceManager: SequenceManagerService,
    private readonly xmlBuilder: XmlBuilderService,
    private readonly signer: SignerService,
    private readonly dgiiApi: DgiiApiService,
  ) {}

  getDashboardStats() {
    const total = this.db.exec("SELECT COUNT(*) FROM facturas");
    const creadas = this.db.exec("SELECT COUNT(*) FROM facturas WHERE estado = 'creada'");
    const enviadas = this.db.exec("SELECT COUNT(*) FROM facturas WHERE estado = 'enviada'");
    const aceptadas = this.db.exec("SELECT COUNT(*) FROM facturas WHERE estado_dgii = 'Aceptado'");
    const rechazadas = this.db.exec("SELECT COUNT(*) FROM facturas WHERE estado_dgii = 'Rechazado'");
    const montoTotal = this.db.exec("SELECT COALESCE(SUM(monto_total), 0) FROM facturas");
    const montoMes = this.db.exec("SELECT COALESCE(SUM(monto_total), 0) FROM facturas WHERE fecha_emision >= date('now', 'start of month')");

    const recientes = this.db.queryRows(
      `SELECT f.id, f.encf, f.tipo_ecf, f.monto_total, f.estado, f.estado_dgii, f.fecha_emision,
              c.razon_social as cliente_nombre
       FROM facturas f LEFT JOIN clientes c ON f.cliente_id = c.id
       ORDER BY f.fecha_creacion DESC LIMIT 10`,
    );

    return {
      total: total[0]?.values[0][0] || 0,
      creadas: creadas[0]?.values[0][0] || 0,
      enviadas: enviadas[0]?.values[0][0] || 0,
      aceptadas: aceptadas[0]?.values[0][0] || 0,
      rechazadas: rechazadas[0]?.values[0][0] || 0,
      montoTotal: montoTotal[0]?.values[0][0] || 0,
      montoMes: montoMes[0]?.values[0][0] || 0,
      recientes,
    };
  }

  findAll(query: { estado?: string; tipo_ecf?: string; page?: number; limit?: number }) {
    const { estado, tipo_ecf, page = 1, limit = 50 } = query;
    let sql = `SELECT f.*, c.razon_social as cliente_nombre, c.rnc_cedula as cliente_rnc
               FROM facturas f LEFT JOIN clientes c ON f.cliente_id = c.id`;
    const conditions: string[] = [];
    const params: any[] = [];

    if (estado) { conditions.push('f.estado = ?'); params.push(estado); }
    if (tipo_ecf) { conditions.push('f.tipo_ecf = ?'); params.push(Number(tipo_ecf)); }
    if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ' ORDER BY f.fecha_creacion DESC';
    sql += ` LIMIT ? OFFSET ?`;
    params.push(Number(limit), (Number(page) - 1) * Number(limit));

    const facturas = this.db.queryRows(sql, params);
    const countResult = this.db.exec("SELECT COUNT(*) FROM facturas");
    const total = countResult.length > 0 ? countResult[0].values[0][0] : 0;

    return { facturas, total, page: Number(page), limit: Number(limit) };
  }

  findOne(id: number) {
    const facturas = this.db.queryRows(
      `SELECT f.*, c.razon_social as cliente_nombre, c.rnc_cedula as cliente_rnc
       FROM facturas f LEFT JOIN clientes c ON f.cliente_id = c.id WHERE f.id = ?`,
      [id],
    );
    if (facturas.length === 0) throw new NotFoundException('Factura no encontrada');

    const detalles = this.db.queryRows(
      `SELECT * FROM detalle_factura WHERE factura_id = ? ORDER BY linea`,
      [id],
    );
    return { factura: facturas[0], detalles };
  }

  create(body: any) {
    const { tipo_ecf, cliente_id, tipo_pago = 1, fecha_vencimiento, notas = '', referencia_encf = '', items = [] } = body;

    if (!tipo_ecf || !items.length) {
      throw new BadRequestException('Tipo de e-CF e ítems son requeridos');
    }

    const fecha_emision = new Date().toISOString().split('T')[0];

    let subtotal = 0, totalDescuento = 0, montoGravado18 = 0, montoGravado16 = 0, montoExento = 0;
    let itbis18 = 0, itbis16 = 0, itbisTotal = 0;

    const processedItems = items.map((item: any, idx: number) => {
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
        codigo_item: item.codigo_item || '',
      };
    });

    const montoTotal = montoGravado18 + montoGravado16 + montoExento + itbisTotal;

    const encf = this.sequenceManager.getNext(Number(tipo_ecf));

    this.db.run(
      `INSERT INTO facturas (encf, tipo_ecf, tipo_pago, cliente_id, fecha_emision, fecha_vencimiento,
        subtotal, total_descuento, monto_gravado_18, monto_gravado_16, monto_exento,
        itbis_18, itbis_16, itbis_total, monto_total, estado, notas, referencia_encf)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [encf, tipo_ecf, tipo_pago, cliente_id || null, fecha_emision, fecha_vencimiento || fecha_emision,
       subtotal, totalDescuento, montoGravado18, montoGravado16, montoExento,
       itbis18, itbis16, itbisTotal, montoTotal, 'creada', notas, referencia_encf],
    );

    const idResult = this.db.exec("SELECT last_insert_rowid()");
    const facturaId = idResult[0].values[0][0];

    for (const item of processedItems) {
      this.db.run(
        `INSERT INTO detalle_factura (factura_id, linea, descripcion, cantidad, unidad_medida,
          precio_unitario, descuento_porcentaje, descuento_monto, tasa_itbis, itbis_monto, monto_total, codigo_item)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        [facturaId, item.linea, item.descripcion, item.cantidad, item.unidad_medida,
         item.precio_unitario, item.descuento_porcentaje, item.descuento_monto,
         item.tasa_itbis, item.itbis_monto, item.monto_total, item.codigo_item],
      );
    }

    // Generate XML
    const config = this.db.queryRows("SELECT * FROM configuracion WHERE id = 1");
    const emisor = config[0] || {};
    let comprador = null;
    if (cliente_id) {
      const clientes = this.db.queryRows("SELECT * FROM clientes WHERE id = ?", [Number(cliente_id)]);
      comprador = clientes[0] || null;
    }

    const facturaData = {
      tipo_ecf: Number(tipo_ecf), encf, fecha_emision, fecha_vencimiento: fecha_vencimiento || fecha_emision,
      tipo_pago, tipo_ingreso: '01', monto_gravado_18: montoGravado18, monto_gravado_16: montoGravado16,
      monto_exento: montoExento, itbis_18: itbis18, itbis_16: itbis16, itbis_total: itbisTotal,
      monto_total: montoTotal, referencia_encf,
    };

    const xmlContent = this.xmlBuilder.buildEcfXml(facturaData, processedItems, emisor, comprador);
    const xmlFirmado = this.signer.signXmlDemo(xmlContent);

    this.db.run("UPDATE facturas SET xml_generado = ?, xml_firmado = ? WHERE id = ?",
      [xmlContent, xmlFirmado, facturaId]);
    this.db.saveDb();

    return { id: facturaId, encf, monto_total: montoTotal, estado: 'creada', message: 'Factura creada exitosamente' };
  }

  async sendToDgii(id: number) {
    const facturas = this.db.queryRows("SELECT * FROM facturas WHERE id = ?", [id]);
    if (facturas.length === 0) throw new NotFoundException('Factura no encontrada');

    const factura = facturas[0];
    if (!factura.xml_firmado) throw new BadRequestException('La factura no tiene XML firmado');

    const result = await this.dgiiApi.simulateSend(factura.encf);

    this.db.run(
      `UPDATE facturas SET estado = 'enviada', estado_dgii = ?, trackid_dgii = ?,
        mensaje_dgii = ?, fecha_envio_dgii = datetime('now') WHERE id = ?`,
      [result.success ? 'enviado' : 'error', result.trackId, result.message, factura.id],
    );
    this.db.saveDb();

    return result;
  }

  async checkDgiiStatus(id: number) {
    const facturas = this.db.queryRows("SELECT * FROM facturas WHERE id = ?", [id]);
    if (facturas.length === 0) throw new NotFoundException('Factura no encontrada');

    const factura = facturas[0];
    if (!factura.trackid_dgii) throw new BadRequestException('La factura no ha sido enviada a la DGII');

    const result = await this.dgiiApi.simulateCheck(factura.trackid_dgii);

    this.db.run(
      `UPDATE facturas SET estado_dgii = ?, mensaje_dgii = ? WHERE id = ?`,
      [result.status, result.message, factura.id],
    );
    this.db.saveDb();

    return result;
  }

  remove(id: number) {
    const facturas = this.db.queryRows("SELECT * FROM facturas WHERE id = ?", [id]);
    if (facturas.length === 0) throw new NotFoundException('Factura no encontrada');
    if (facturas[0].estado !== 'borrador' && facturas[0].estado !== 'creada') {
      throw new BadRequestException('Solo se pueden eliminar facturas en borrador o creadas');
    }

    this.db.run("DELETE FROM detalle_factura WHERE factura_id = ?", [id]);
    this.db.run("DELETE FROM facturas WHERE id = ?", [id]);
    this.db.saveDb();

    return { message: 'Factura eliminada' };
  }
}
