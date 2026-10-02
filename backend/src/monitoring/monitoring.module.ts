import { Module } from '@nestjs/common';
import { MonitoringController } from './monitoring.controller';
import { PhpMetricsService } from './php-metrics.service';

@Module({
  controllers: [MonitoringController],
  providers: [PhpMetricsService],
  exports: [PhpMetricsService],
})
export class MonitoringModule {}
