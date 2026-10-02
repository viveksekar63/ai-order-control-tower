import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiRcaService } from './ai-rca.service';

@Module({
  controllers: [AiController],
  providers: [AiRcaService],
  exports: [AiRcaService],
})
export class AiModule {}
