import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma.module';
import { OrdersModule } from './orders/orders.module';
import { ExceptionsModule } from './exceptions/exceptions.module';
import { MonitoringModule } from './monitoring/monitoring.module';
import { CorrelationModule } from './correlation/correlation.module';
import { AiModule } from './ai/ai.module';
import { ActionsModule } from './actions/actions.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    OrdersModule,
    ExceptionsModule,
    MonitoringModule,
    CorrelationModule,
    AiModule,
    ActionsModule,
    AuthModule,
  ],
})
export class AppModule {}
