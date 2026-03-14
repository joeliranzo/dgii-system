import { Controller, Get, Post, Delete, Param, Query, Body } from '@nestjs/common';
import { FacturasService } from './facturas.service';

@Controller('facturas')
export class FacturasController {
  constructor(private readonly facturasService: FacturasService) {}

  @Get('stats/dashboard')
  getDashboardStats() {
    return this.facturasService.getDashboardStats();
  }

  @Get()
  findAll(
    @Query('estado') estado?: string,
    @Query('tipo_ecf') tipo_ecf?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.facturasService.findAll({ estado, tipo_ecf, page, limit });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.facturasService.findOne(+id);
  }

  @Post()
  create(@Body() body: any) {
    return this.facturasService.create(body);
  }

  @Post(':id/enviar')
  sendToDgii(@Param('id') id: string) {
    return this.facturasService.sendToDgii(+id);
  }

  @Post(':id/consultar')
  checkDgiiStatus(@Param('id') id: string) {
    return this.facturasService.checkDgiiStatus(+id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.facturasService.remove(+id);
  }
}
