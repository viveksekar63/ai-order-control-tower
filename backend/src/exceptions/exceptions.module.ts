import { Module } from '@nestjs/common';
import { ExceptionDetectorService } from './exception-detector.service';
import { ExceptionsController } from './exceptions.controller';

@Module({
  controllers: [ExceptionsController],
  providers: [ExceptionDetectorService],
  exports: [ExceptionDetectorService],
})
export class ExceptionsModule {}
