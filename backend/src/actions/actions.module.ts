import { Module } from '@nestjs/common';
import { ActionsController } from './actions.controller';
import { ActionsService } from './actions.service';
import { ActionPolicyService } from './action-policy.service';

@Module({
  controllers: [ActionsController],
  providers: [ActionsService, ActionPolicyService],
  exports: [ActionsService, ActionPolicyService],
})
export class ActionsModule {}
