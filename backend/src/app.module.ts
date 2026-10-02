import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma.module';
import { OrdersModule } from './orders/orders.module';
import { ExceptionsModule } from './exceptions/exceptions.module';
import { MonitoringModule } from './monitoring/monitoring.module';
import { CorrelationModule } from './correlation/correlation.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    OrdersModule,
    ExceptionsModule,
    MonitoringModule,
    CorrelationModule,
  ],
})
export class AppModule {}
