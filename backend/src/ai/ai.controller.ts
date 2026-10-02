import { Controller, Param, Post } from '@nestjs/common';
import { AiRcaService } from './ai-rca.service';

@Controller('ai')
export class AiController {
  constructor(private readonly rca: AiRcaService) {}

  @Post('exceptions/:exceptionId/diagnose')
  diagnose(@Param('exceptionId') exceptionId: string) {
    return this.rca.diagnose(exceptionId);
  }
}
