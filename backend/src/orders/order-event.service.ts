import { Injectable } from '@nestjs/common';
import {
  EventStatus,
  ExceptionSeverity,
  OrderState,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { ProcessOrderEventDto } from './dto/process-order-event.dto';
import { OrderStateMachine } from './order-state-machine';

@Injectable()
export class OrderEventService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stateMachine: OrderStateMachine,
  ) {}

  async process(dto: ProcessOrderEventDto) {
    const occurredAt = new Date(dto.occurredAt);

    const existingEvent = await this.prisma.orderEvent.findUnique({
      where: {
        source_eventId: {
          source: dto.source,
          eventId: dto.eventId,
        },
      },
      include: { order: true },
    });

    if (existingEvent) {
      return {
        success: existingEvent.status === EventStatus.PROCESSED,
        duplicate: true,
        eventId: existingEvent.id,
        orderId: existingEvent.orderId,
        state: existingEvent.order.currentState,
        eventStatus: existingEvent.status,
      };
    }

    return this.prisma.$transaction(async (tx) => {
      let order = await tx.order.findUnique({
        where: { externalOrderId: dto.externalOrderId },
      });

      if (!order) {
        order = await tx.order.create({
          data: {
            externalOrderId: dto.externalOrderId,
            incrementId: dto.incrementId,
            customerId: dto.customerId,
            channel: this.toOrderChannel(dto.channel),
            store: dto.store,
            currentState: OrderState.ORDER_CREATED,
            lastEventAt: occurredAt,
          },
        });

        await tx.orderStateHistory.create({
          data: {
            orderId: order.id,
            fromState: null,
            toState: OrderState.ORDER_CREATED,
            reason: 'Order created by first observed event',
            changedAt: occurredAt,
          },
        });
      }

      const event = await tx.orderEvent.create({
        data: {
          orderId: order.id,
          eventType: dto.eventType,
          source: dto.source,
          eventId: dto.eventId,
          payload: dto.payload as Prisma.InputJsonValue,
          occurredAt,
          status: EventStatus.PROCESSING,
        },
      });

      const targetState = this.stateMachine.getTargetState(dto.eventType);
      const fromState = order.currentState;

      if (!this.stateMachine.canTransition(fromState, targetState)) {
        const message = `Invalid order state transition: ${fromState} -> ${targetState}`;

        await tx.orderEvent.update({
          where: { id: event.id },
          data: {
            status: EventStatus.FAILED,
            processedAt: new Date(),
            errorMessage: message,
          },
        });

        await tx.orderException.create({
          data: {
            orderId: order.id,
            code: 'INVALID_STATE_TRANSITION',
            title: 'Invalid order state transition',
            description: message,
            severity: ExceptionSeverity.HIGH,
            evidence: {
              eventId: dto.eventId,
              eventType: dto.eventType,
              source: dto.source,
              fromState,
              targetState,
              occurredAt: dto.occurredAt,
            } as Prisma.InputJsonValue,
          },
        });

        return {
          success: false,
          duplicate: false,
          eventId: event.id,
          orderId: order.id,
          previousState: fromState,
          state: fromState,
          eventStatus: EventStatus.FAILED,
          exceptionCode: 'INVALID_STATE_TRANSITION',
        };
      }

      const isSameState = fromState === targetState;
      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          lastEventAt:
            order.lastEventAt && order.lastEventAt > occurredAt
              ? order.lastEventAt
              : occurredAt,
          ...(isSameState
            ? {}
            : {
                previousState: fromState,
                currentState: targetState,
              }),
          ...this.statusFieldUpdate(targetState),
        },
      });

      if (!isSameState) {
        await tx.orderStateHistory.create({
          data: {
            orderId: order.id,
            fromState,
            toState: targetState,
            reason: `Event ${dto.eventType} received from ${dto.source}`,
            eventId: dto.eventId,
            changedAt: occurredAt,
          },
        });
      }

      await tx.orderEvent.update({
        where: { id: event.id },
        data: {
          status: EventStatus.PROCESSED,
          processedAt: new Date(),
        },
      });

      return {
        success: true,
        duplicate: false,
        eventId: event.id,
        orderId: updatedOrder.id,
        previousState: fromState,
        state: updatedOrder.currentState,
        eventStatus: EventStatus.PROCESSED,
      };
    });
  }

  private statusFieldUpdate(state: OrderState): Prisma.OrderUpdateInput {
    switch (state) {
      case OrderState.PAYMENT_PENDING:
      case OrderState.PAYMENT_SUCCESS:
      case OrderState.PAYMENT_FAILED:
        return { paymentStatus: state };
      case OrderState.INVOICE_PENDING:
      case OrderState.INVOICE_CREATED:
        return { invoiceStatus: state };
      case OrderState.OMS_PENDING:
      case OrderState.OMS_SUBMITTED:
      case OrderState.OMS_SUBMISSION_FAILED:
      case OrderState.ALLOCATED:
      case OrderState.UNALLOCATED:
        return { omsStatus: state };
      case OrderState.SHIPMENT_PENDING:
      case OrderState.SHIPMENT_CREATED:
      case OrderState.SHIPPED:
      case OrderState.DELIVERED:
        return { shipmentStatus: state };
      case OrderState.REFUND_PENDING:
      case OrderState.REFUND_PROCESSING:
      case OrderState.REFUNDED:
      case OrderState.REFUND_FAILED:
        return { refundStatus: state };
      default:
        return {};
    }
  }

  private toOrderChannel(channel?: string) {
    if (!channel) return undefined;

    const allowed = ['WEB', 'MOBILE', 'POS', 'CLICK_AND_COLLECT', 'MARKETPLACE', 'OTHER'] as const;
    return allowed.includes(channel as (typeof allowed)[number])
      ? (channel as (typeof allowed)[number])
      : 'OTHER';
  }
}
