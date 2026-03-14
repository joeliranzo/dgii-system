import { Controller, Get, Put, Param, Body } from '@nestjs/common';
import { ConfiguracionService } from './configuracion.service';

@Controller('configuracion')
export class ConfiguracionController {
  constructor(private readonly configuracionService: ConfiguracionService) {}

  @Get()
  getAll() {
    return this.configuracionService.getAll();
  }

  @Put()
  update(@Body() body: any) {
    return this.configuracionService.update(body);
  }

  @Put('secuencias/:tipo')
  updateSequence(@Param('tipo') tipo: string, @Body() body: { desde: number; hasta: number }) {
    return this.configuracionService.updateSequence(+tipo, body);
  }
}
