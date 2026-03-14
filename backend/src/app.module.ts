import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { FacturasModule } from './facturas/facturas.module';
import { ClientesModule } from './clientes/clientes.module';
import { ConfiguracionModule } from './configuracion/configuracion.module';
import { EcfModule } from './ecf/ecf.module';
import { DgiiModule } from './dgii/dgii.module';

@Module({
  imports: [
    DatabaseModule,
    EcfModule,
    DgiiModule,
    FacturasModule,
    ClientesModule,
    ConfiguracionModule,
  ],
})
export class AppModule {}
