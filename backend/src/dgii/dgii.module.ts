import { Module } from '@nestjs/common';
import { DgiiApiService } from './dgii-api.service';

@Module({
  providers: [DgiiApiService],
  exports: [DgiiApiService],
})
export class DgiiModule {}
