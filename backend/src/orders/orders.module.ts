import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrderEventService } from './order-event.service';
import { OrderStateMachine } from './order-state-machine';

@Module({
  controllers: [OrdersController],
  providers: [OrderEventService, OrderStateMachine],
})
export class OrdersModule {}
