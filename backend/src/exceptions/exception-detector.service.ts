import { Injectable } from '@nestjs/common';
import { ExceptionSeverity, ExceptionStatus, OrderState, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';

type Rule = {
  state: OrderState;
  code: string;
  title: string;
  description: string;
  severity: ExceptionSeverity;
  thresholdMinutes: number;
};

@Injectable()
export class ExceptionDetectorService {
  private readonly rules: Rule[] = [
    {
      state: OrderState.PAYMENT_SUCCESS,
      code: 'INVOICE_MISSING',
      title: 'Invoice missing after successful payment',
      description: 'Payment succeeded but an invoice has not been created within the configured threshold.',
      severity: ExceptionSeverity.HIGH,
      thresholdMinutes: 5,
    },
    {
      state: OrderState.INVOICE_CREATED,
      code: 'OMS_SUBMISSION_MISSING',
      title: 'OMS submission missing',
      description: 'Invoice was created but the order has not been submitted to OMS within the configured threshold.',
      severity: ExceptionSeverity.HIGH,
      thresholdMinutes: 10,
    },
    {
      state: OrderState.ALLOCATED,
      code: 'SHIPMENT_MISSING',
      title: 'Shipment creation missing',
      description: 'Order was allocated but shipment creation has not occurred within the configured threshold.',
      severity: ExceptionSeverity.MEDIUM,
      thresholdMinutes: 30,
    },
    {
      state: OrderState.REFUND_PROCESSING,
      code: 'REFUND_STUCK',
      title: 'Refund processing is stuck',
      description: 'Refund processing has not reached a terminal state within the configured threshold.',
      severity: ExceptionSeverity.HIGH,
      thresholdMinutes: 30,
    },
  ];

  constructor(private readonly prisma: PrismaService) {}

  async scan() {
    const now = new Date();
    const detected: Array<{ orderId: string; externalOrderId: string; code: string; exceptionId: string; status: ExceptionStatus; action: 'NEW' | 'ALREADY_OPEN' }> = [];
    let ordersScanned = 0;
    let newExceptions = 0;
    let existingExceptions = 0;

    for (const rule of this.rules) {
      const cutoff = new Date(now.getTime() - rule.thresholdMinutes * 60_000);

      const orders = await this.prisma.order.findMany({
        where: {
          currentState: rule.state,
          lastEventAt: { lte: cutoff },
        },
        select: {
          id: true,
          externalOrderId: true,
          incrementId: true,
          currentState: true,
          lastEventAt: true,
          paymentStatus: true,
          invoiceStatus: true,
          omsStatus: true,
          shipmentStatus: true,
          refundStatus: true,
        },
        take: 500,
      });

      ordersScanned += orders.length;

      for (const order of orders) {
        const existing = await this.prisma.orderException.findFirst({
          where: {
            orderId: order.id,
            code: rule.code,
            status: {
              in: [
                ExceptionStatus.OPEN,
                ExceptionStatus.ACKNOWLEDGED,
                ExceptionStatus.INVESTIGATING,
              ],
            },
          },
          select: { id: true },
        });

        if (existing) {
          await this.prisma.orderException.update({
            where: { id: existing.id },
            data: { lastDetectedAt: now },
          });
          existingExceptions += 1;
          detected.push({
            orderId: order.id,
            externalOrderId: order.externalOrderId,
            code: rule.code,
            exceptionId: existing.id,
            status: ExceptionStatus.OPEN,
            action: 'ALREADY_OPEN',
          });
          continue;
        }

        const exception = await this.prisma.orderException.create({
          data: {
            orderId: order.id,
            code: rule.code,
            title: rule.title,
            description: rule.description,
            severity: rule.severity,
            evidence: {
              detectedAt: now.toISOString(),
              thresholdMinutes: rule.thresholdMinutes,
              currentState: order.currentState,
              lastEventAt: order.lastEventAt?.toISOString() ?? null,
              ageMinutes: order.lastEventAt
                ? Math.floor((now.getTime() - order.lastEventAt.getTime()) / 60_000)
                : null,
              order: {
                externalOrderId: order.externalOrderId,
                incrementId: order.incrementId,
              },
              statuses: {
                payment: order.paymentStatus,
                invoice: order.invoiceStatus,
                oms: order.omsStatus,
                shipment: order.shipmentStatus,
                refund: order.refundStatus,
              },
              phpCorrelation: {
                status: 'PENDING',
                orderId: order.id,
                note: 'PHP process metrics can be correlated against this order and detection window when available.',
              },
            } as Prisma.InputJsonValue,
          },
        });

        newExceptions += 1;
        detected.push({
          orderId: order.id,
          externalOrderId: order.externalOrderId,
          code: rule.code,
          exceptionId: exception.id,
          status: ExceptionStatus.OPEN,
          action: 'NEW',
        });
      }
    }

    return {
      success: true,
      scannedAt: now,
      detectedCount: detected.length,
      summary: {
        ordersScanned,
        newExceptions,
        existingExceptions,
      },
      detected,
    };
  }
}
