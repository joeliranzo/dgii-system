import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { SequenceManagerService } from '../ecf/sequence-manager.service';

@Injectable()
export class ConfiguracionService {
  constructor(
    private readonly db: DatabaseService,
    private readonly sequenceManager: SequenceManagerService,
  ) {}

  getAll() {
    const config = this.db.queryRows("SELECT * FROM configuracion WHERE id = 1");
    const secuencias = this.sequenceManager.getAll();
    return { configuracion: config[0] || {}, secuencias };
  }

  update(body: any) {
    const { rnc, razon_social, nombre_comercial, direccion, municipio, provincia, telefono, correo, website, actividad_economica, ambiente } = body;

    this.db.run(
      `UPDATE configuracion SET
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
      [rnc, razon_social, nombre_comercial, direccion, municipio, provincia, telefono, correo, website, actividad_economica, ambiente],
    );
    this.db.saveDb();

    return { message: 'Configuración actualizada exitosamente' };
  }

  updateSequence(tipo: number, body: { desde: number; hasta: number }) {
    const { desde, hasta } = body;
    if (!desde || !hasta) {
      throw new Error('Rango desde/hasta es requerido');
    }
    this.sequenceManager.updateRange(tipo, desde, hasta);
    this.db.saveDb();
    return { message: 'Secuencia actualizada' };
  }
}
