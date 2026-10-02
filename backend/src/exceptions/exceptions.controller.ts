import { Controller, Post } from '@nestjs/common';
import { ExceptionDetectorService } from './exception-detector.service';

@Controller('exceptions')
export class ExceptionsController {
  constructor(private readonly detector: ExceptionDetectorService) {}

  @Post('scan')
  scan() {
    return this.detector.scan();
  }
}
