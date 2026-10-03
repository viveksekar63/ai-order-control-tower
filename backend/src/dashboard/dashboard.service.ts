import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async summary() {
    const [totalOrders, openExceptions, criticalExceptions, requestedActions, runningActions] =
      await Promise.all([
        this.prisma.order.count(),
        this.prisma.orderException.count({ where: { status: 'OPEN' } }),
        this.prisma.orderException.count({ where: { status: 'OPEN', severity: 'CRITICAL' } }),
        this.prisma.orderAction.count({ where: { status: 'REQUESTED' } }),
        this.prisma.orderAction.count({ where: { status: 'RUNNING' } }),
      ]);

    return {
      totalOrders,
      openExceptions,
      criticalExceptions,
      requestedActions,
      runningActions,
    };
  }

  async exceptions() {
    return this.prisma.orderException.findMany({
      where: { status: 'OPEN' },
      orderBy: [{ severity: 'desc' }, { lastDetectedAt: 'desc' }],
      take: 50,
      include: {
        order: {
          select: {
            id: true,
            incrementId: true,
            externalOrderId: true,
            currentState: true,
            updatedAt: true,
          },
        },
      },
    });
  }

  async orders() {
    return this.prisma.order.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 50,
      select: {
        id: true,
        incrementId: true,
        externalOrderId: true,
        channel: true,
        currentState: true,
        paymentStatus: true,
        invoiceStatus: true,
        omsStatus: true,
        shipmentStatus: true,
        updatedAt: true,
      },
    });
  }
}
