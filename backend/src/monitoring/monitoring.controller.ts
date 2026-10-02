import { Body, Controller, Post } from '@nestjs/common';
import { PhpMetricsService } from './php-metrics.service';
import { RecordPhpMetricDto } from './dto/record-php-metric.dto';

@Controller('monitoring')
export class MonitoringController {
  constructor(private readonly phpMetrics: PhpMetricsService) {}

  @Post('php')
  recordPhpMetric(@Body() dto: RecordPhpMetricDto) {
    return this.phpMetrics.record(dto);
  }
}
