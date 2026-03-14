import { Module } from '@nestjs/common';
import { FacturasController } from './facturas.controller';
import { FacturasService } from './facturas.service';
import { EcfModule } from '../ecf/ecf.module';
import { DgiiModule } from '../dgii/dgii.module';

@Module({
  imports: [EcfModule, DgiiModule],
  controllers: [FacturasController],
  providers: [FacturasService],
})
export class FacturasModule {}
