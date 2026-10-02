import { Module } from '@nestjs/common';
import { CorrelationController } from './correlation.controller';
import { IncidentCorrelationService } from './incident-correlation.service';

@Module({
  controllers: [CorrelationController],
  providers: [IncidentCorrelationService],
  exports: [IncidentCorrelationService],
})
export class CorrelationModule {}
