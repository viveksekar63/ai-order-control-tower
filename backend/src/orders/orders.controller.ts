import { Body, Controller, Post } from '@nestjs/common';
import { ProcessOrderEventDto } from './dto/process-order-event.dto';
import { OrderEventService } from './order-event.service';

@Controller('events')
export class OrdersController {
  constructor(private readonly orderEventService: OrderEventService) {}

  @Post('order')
  processOrderEvent(@Body() dto: ProcessOrderEventDto) {
    return this.orderEventService.process(dto);
  }
}
