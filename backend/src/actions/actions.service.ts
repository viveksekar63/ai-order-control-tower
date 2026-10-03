import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { ActionStatus, ActionType, ExceptionStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { RequestActionDto } from './dto/request-action.dto';
import { ActionPolicyService } from './action-policy.service';

@Injectable()
export class ActionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policy: ActionPolicyService,
  ) {}

  async request(dto: RequestActionDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      select: { id: true, externalOrderId: true, currentState: true },
    });

    if (!order) {
      throw new NotFoundException(`Order not found: ${dto.orderId}`);
    }

    if (dto.exceptionId) {
      const exception = await this.prisma.orderException.findUnique({
        where: { id: dto.exceptionId },
        select: { id: true, orderId: true, status: true },
      });

      if (!exception) {
        throw new NotFoundException(`Exception not found: ${dto.exceptionId}`);
      }

      if (exception.orderId !== order.id) {
        throw new BadRequestException('Exception does not belong to the supplied order');
      }

      if (exception.status === ExceptionStatus.RESOLVED || exception.status === ExceptionStatus.IGNORED) {
        throw new BadRequestException('Cannot request an action for a resolved or ignored exception');
      }
    }

    this.policy.assertRequestActor(dto.type, dto.requestedBy);

    const action = await this.prisma.orderAction.create({
      data: {
        orderId: order.id,
        exceptionId: dto.exceptionId,
        type: dto.type,
        status: ActionStatus.REQUESTED,
        requestedBy: dto.requestedBy,
        input: dto.input as Prisma.InputJsonValue | undefined,
      },
    });

    await this.audit(
      dto.requestedBy,
      'ACTION_REQUESTED',
      'OrderAction',
      action.id,
      null,
      action,
      { externalOrderId: order.externalOrderId },
    );

    return {
      success: true,
      action: this.toResponse(action),
      message: 'Action requested. Human approval is required before execution.',
    };
  }

  async approve(actionId: string, actorId?: string) {
    const action = await this.getAction(actionId);

    if (action.status !== ActionStatus.REQUESTED) {
      throw new ConflictException(`Only REQUESTED actions can be approved. Current status: ${action.status}`);
    }

    this.policy.assertApprovalActor(action.type, action.requestedBy, actorId);

    const updated = await this.prisma.orderAction.update({
      where: { id: actionId },
      data: {
        status: ActionStatus.APPROVED,
        approvedBy: actorId,
      },
    });

    await this.audit(actorId, 'ACTION_APPROVED', 'OrderAction', actionId, action, updated);

    return { success: true, action: this.toResponse(updated) };
  }

  async reject(actionId: string, actorId?: string) {
    const action = await this.getAction(actionId);

    if (action.status !== ActionStatus.REQUESTED) {
      throw new ConflictException(`Only REQUESTED actions can be rejected. Current status: ${action.status}`);
    }

    const updated = await this.prisma.orderAction.update({
      where: { id: actionId },
      data: { status: ActionStatus.REJECTED },
    });

    await this.audit(actorId, 'ACTION_REJECTED', 'OrderAction', actionId, action, updated);

    return { success: true, action: this.toResponse(updated) };
  }

  async execute(actionId: string) {
    const action = await this.getAction(actionId);

    if (action.status !== ActionStatus.APPROVED) {
      throw new ConflictException(`Only APPROVED actions can be executed. Current status: ${action.status}`);
    }

    const startedAt = new Date();

    const running = await this.prisma.orderAction.update({
      where: { id: actionId },
      data: { status: ActionStatus.RUNNING, startedAt },
    });

    await this.audit(
      action.approvedBy,
      'ACTION_EXECUTION_STARTED',
      'OrderAction',
      actionId,
      action,
      running,
    );

    try {
      const output = await this.executeSafely(running.type, running.input);

      const succeeded = await this.prisma.orderAction.update({
        where: { id: actionId },
        data: {
          status: ActionStatus.SUCCEEDED,
          output: output as Prisma.InputJsonValue,
          completedAt: new Date(),
        },
      });

      await this.audit(
        action.approvedBy,
        'ACTION_EXECUTED',
        'OrderAction',
        actionId,
        running,
        succeeded,
        { mode: 'SIMULATION' },
      );

      return {
        success: true,
        mode: 'SIMULATION',
        action: this.toResponse(succeeded),
      };
    } catch (error) {
      const failed = await this.prisma.orderAction.update({
        where: { id: actionId },
        data: {
          status: ActionStatus.FAILED,
          errorMessage: error instanceof Error ? error.message : 'Unknown action execution error',
          completedAt: new Date(),
        },
      });

      await this.audit(
        action.approvedBy,
        'ACTION_EXECUTION_FAILED',
        'OrderAction',
        actionId,
        running,
        failed,
      );

      throw error;
    }
  }

  async listByOrder(orderId: string) {
    const actions = await this.prisma.orderAction.findMany({
      where: { orderId },
      orderBy: { requestedAt: 'desc' },
    });

    return {
      success: true,
      orderId,
      actions: actions.map((action) => this.toResponse(action)),
    };
  }

  private async getAction(actionId: string) {
    const action = await this.prisma.orderAction.findUnique({
      where: { id: actionId },
    });

    if (!action) {
      throw new NotFoundException(`Action not found: ${actionId}`);
    }

    return action;
  }

  private async executeSafely(type: ActionType, input: Prisma.JsonValue | null) {
    return {
      simulated: true,
      actionType: type,
      message: `Action ${type} passed approval and was executed in simulation mode. No Magento/OMS production call was made.`,
      input,
      executedAt: new Date().toISOString(),
    };
  }

  private async audit(
    actorId: string | null | undefined,
    action: string,
    entityType: string,
    entityId: string,
    before: unknown,
    after: unknown,
    metadata?: Prisma.InputJsonValue,
  ) {
    await this.prisma.auditLog.create({
      data: {
        actorId,
        action,
        entityType,
        entityId,
        before: before as Prisma.InputJsonValue | undefined,
        after: after as Prisma.InputJsonValue | undefined,
        metadata,
      },
    });
  }

  private toResponse(action: {
    id: string;
    orderId: string;
    exceptionId: string | null;
    type: ActionType;
    status: ActionStatus;
    requestedBy: string | null;
    approvedBy: string | null;
    input: Prisma.JsonValue | null;
    output: Prisma.JsonValue | null;
    errorMessage: string | null;
    requestedAt: Date;
    startedAt: Date | null;
    completedAt: Date | null;
  }) {
    return {
      id: action.id,
      orderId: action.orderId,
      exceptionId: action.exceptionId,
      type: action.type,
      status: action.status,
      requestedBy: action.requestedBy,
      approvedBy: action.approvedBy,
      input: action.input,
      output: action.output,
      errorMessage: action.errorMessage,
      requestedAt: action.requestedAt,
      startedAt: action.startedAt,
      completedAt: action.completedAt,
    };
  }
}
