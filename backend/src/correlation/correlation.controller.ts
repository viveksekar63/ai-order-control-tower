import { Controller, Param, Post } from '@nestjs/common';
import { IncidentCorrelationService } from './incident-correlation.service';

@Controller('correlation')
export class CorrelationController {
  constructor(private readonly correlation: IncidentCorrelationService) {}

  @Post('exceptions/:exceptionId')
  correlateException(@Param('exceptionId') exceptionId: string) {
    return this.correlation.correlateException(exceptionId);
  }

  @Post('exceptions/open')
  correlateOpenExceptions() {
    return this.correlation.correlateOpenExceptions();
  }
}
