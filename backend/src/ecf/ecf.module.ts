import { Module } from '@nestjs/common';
import { SequenceManagerService } from './sequence-manager.service';
import { XmlBuilderService } from './xml-builder.service';
import { SignerService } from './signer.service';

@Module({
  providers: [SequenceManagerService, XmlBuilderService, SignerService],
  exports: [SequenceManagerService, XmlBuilderService, SignerService],
})
export class EcfModule {}
