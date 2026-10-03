import { Injectable, ForbiddenException } from '@nestjs/common';
import { ActionType } from '@prisma/client';

type ActionPolicy = {
  requestPermission: string;
  approvalPermission: string;
  requiresSeparateApprover: boolean;
};

@Injectable()
export class ActionPolicyService {
  private readonly policies: Record<ActionType, ActionPolicy> = {
    [ActionType.RETRY]: { requestPermission: 'order.retry.request', approvalPermission: 'order.retry.approve', requiresSeparateApprover: true },
    [ActionType.CANCEL]: { requestPermission: 'order.cancel.request', approvalPermission: 'order.cancel.approve', requiresSeparateApprover: true },
    [ActionType.REFUND]: { requestPermission: 'order.refund.request', approvalPermission: 'order.refund.approve', requiresSeparateApprover: true },
    [ActionType.RESYNC]: { requestPermission: 'order.resync.request', approvalPermission: 'order.resync.approve', requiresSeparateApprover: true },
    [ActionType.REPROCESS]: { requestPermission: 'order.reprocess.request', approvalPermission: 'order.reprocess.approve', requiresSeparateApprover: true },
    [ActionType.ESCALATE]: { requestPermission: 'order.escalate.request', approvalPermission: 'order.escalate.approve', requiresSeparateApprover: true },
    [ActionType.NOTIFY]: { requestPermission: 'order.notify.request', approvalPermission: 'order.notify.approve', requiresSeparateApprover: true },
  };

  getPolicy(type: ActionType) {
    const policy = this.policies[type];
    if (!policy) {
      throw new ForbiddenException(`No action policy configured for ${type}`);
    }
    return policy;
  }

  assertRequestActor(type: ActionType, actorId?: string) {
    if (!actorId?.trim()) {
      throw new ForbiddenException('A requesting actor is required');
    }
    return this.getPolicy(type);
  }

  assertApprovalActor(type: ActionType, requestedBy: string | null, actorId?: string) {
    const policy = this.getPolicy(type);

    if (!actorId?.trim()) {
      throw new ForbiddenException('An approving actor is required');
    }

    if (policy.requiresSeparateApprover && requestedBy && requestedBy === actorId) {
      throw new ForbiddenException('Separation of duties: requester cannot approve the same action');
    }

    return policy;
  }
}
